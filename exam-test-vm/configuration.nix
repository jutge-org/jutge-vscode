{ pkgs, lib, ... }:

let
  # JUTGE_FORCE_DEVMODE switch for the jutge-vscode extension.
  #   true  -> JUTGE_FORCE_DEVMODE=1 is exported to VS Code (and therefore to
  #            the extension host, integrated terminals, tasks, ...)
  #   false -> the variable is not set at all
  jutgeForceDevMode = true;

  # Base hosts (FQDNs, without the `dev.` prefix) the VM is allowed to
  # reach (HTTP/HTTPS only, plus DNS/DHCP). Add as many entries as needed.
  baseHosts = [
    "exam.jutge.org"
    "exam.api.jutge.org"
  ];

  # The `dev.` prefix is only applied when dev mode is on.
  hostPrefix = lib.optionalString jutgeForceDevMode "dev.";

  # Hosts actually whitelisted in the egress firewall.
  allowedHosts = map (host: "${hostPrefix}${host}") baseHosts;

  # Human-readable version, used in comments and service descriptions.
  allowedHostsList = lib.concatStringsSep ", " allowedHosts;

  # Environment variables exported to VS Code. Add more vars here if needed.
  vscodeEnv = lib.optionalAttrs jutgeForceDevMode {
    JUTGE_FORCE_DEVMODE = "1";
  };

  # `--set NAME VALUE` flags for makeWrapper, derived from `vscodeEnv`.
  vscodeEnvArgs = lib.concatStrings (
    lib.mapAttrsToList (
      name: value: " --set ${lib.escapeShellArg name} ${lib.escapeShellArg (toString value)}"
    )
    vscodeEnv
  );

  # 1. Package the local .vsix file into Nix
  myCustomExtension = pkgs.vscode-utils.buildVscodeExtension {
    pname = "jutge-vscode";
    vscodeExtName = "jutge-vscode"; # Matches 'name' in package.json
    vscodeExtPublisher = "jutge-org"; # Matches 'publisher' in package.json
    version = "0.1.12"; # Matches 'version' in package.json
    src = ./jutge-vscode.vsix; # Path to your .vsix file (must live inside the flake dir for pure evaluation)
    vscodeExtUniqueId = "jutge-org.vscode";
  };

  # 2. Wrap VSCode with your extension pre-installed.
  #    ms-python.python comes first because jutge-vscode depends on it.
  vscodeWithExtensions = pkgs.vscode-with-extensions.override {
    vscodeExtensions = [
      pkgs.vscode-extensions.ms-python.python
      myCustomExtension
    ];
  };

  # 3. Re-wrap the `code` executable so `vscodeEnv` is part of VS Code's own
  #    environment. This is scoped to the editor (not the system environment)
  #    and cannot be lost, no matter how VS Code is launched (desktop menu,
  #    terminal, ...). When `vscodeEnv` is empty, this is a plain re-export of
  #    the package above.
  vscodeWithExtension = pkgs.symlinkJoin {
    name = "vscode-with-jutge-extension";
    paths = [ vscodeWithExtensions ];
    nativeBuildInputs = [ pkgs.makeWrapper ];
    postBuild = lib.optionalString (vscodeEnv != { }) ''
      for f in "$out"/bin/*; do
        target="$(readlink -f "$f")"
        rm "$f"
        makeWrapper "$target" "$f" ${vscodeEnvArgs}
      done
    '';
  };
in
{
  # Enable Unfree Software (Required for VSCode)
  nixpkgs.config.allowUnfree = true;

  # Basic VM Settings & User Configuration
  networking.hostName = "exam-vm"; # VM/runner script name: run-exam-vm-vm
  system.stateVersion = "26.11";

  boot.loader.grub.enable = true;
  boot.loader.grub.device = "/dev/vda";

  users.users.student = {
    isNormalUser = true;
    extraGroups = [
      "wheel"
      "networkmanager"
    ];
    password = "student";
  };

  services.getty.autologinUser = "student";

  # Graphical Desktop (XFCE)
  services.xserver = {
    enable = true;
    desktopManager.xfce.enable = true;

    # Spanish keyboard, Catalan variant
    xkb.layout = "es";
    xkb.variant = "cat";
  };

  # Console keyboard layout (text consoles / early boot)
  console.keyMap = "es";

  # System Packages
  environment.systemPackages = with pkgs; [
    vscodeWithExtension
    git
    curl
    dig
    # Toolchain used by the jutge-vscode extension
    gcc # provides gcc, g++ and c++
    python3
    # Web browser. luakit reuses the WebKitGTK 4.1 engine already pulled in by
    # XFCE's tumbler, so it only adds a few MB (vs ~190 MB for epiphany, which
    # needs a second WebKitGTK 6.0, or ~640 MB for firefox).
    luakit
  ];

  # Make it the default browser, so `xdg-open` works (the extension calls
  # `vscode.env.openExternal` for links).
  xdg.mime.defaultApplications = {
    "x-scheme-handler/http" = "luakit.desktop";
    "x-scheme-handler/https" = "luakit.desktop";
    "text/html" = "luakit.desktop";
  };

  # ------------------------------------------------------------------
  # Egress firewall: only the hosts in `allowedHosts` (plus DNS/DHCP)
  # are reachable.
  #
  # Two stages, because firewall.service runs *before* networking/DNS
  # are up at boot:
  #  1. extraCommands (early boot): install a fail-CLOSED policy that
  #     does not depend on DNS (allow loopback, DNS, DHCP; reject rest).
  #  2. exam-whitelist.service (after network is online): resolve
  #     each host in `allowedHosts`, retrying until it succeeds, and
  #     whitelist its IPs.
  # ------------------------------------------------------------------
  networking.firewall = {
    enable = true;

    extraCommands = ''
      # IPv4 egress chain
      iptables -N exam-egress 2>/dev/null || true
      iptables -F exam-egress
      iptables -A exam-egress -o lo -j ACCEPT
      iptables -A exam-egress -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
      iptables -A exam-egress -p udp --dport 53 -j ACCEPT # DNS (needed to resolve ${allowedHostsList})
      iptables -A exam-egress -p tcp --dport 53 -j ACCEPT
      iptables -A exam-egress -p udp --dport 67:68 -j ACCEPT # DHCP renewals
      # ACCEPT rules for ${allowedHostsList} are inserted above the REJECT
      # by exam-whitelist.service once DNS works.
      iptables -A exam-egress -j REJECT --reject-with icmp-admin-prohibited
      iptables -C OUTPUT -j exam-egress 2>/dev/null || iptables -A OUTPUT -j exam-egress

      # IPv6: allow loopback only, reject everything else (no bypass)
      ip6tables -N exam-egress 2>/dev/null || true
      ip6tables -F exam-egress
      ip6tables -A exam-egress -o lo -j ACCEPT
      ip6tables -A exam-egress -j REJECT --reject-with icmp6-adm-prohibited
      ip6tables -C OUTPUT -j exam-egress 2>/dev/null || ip6tables -A OUTPUT -j exam-egress
    '';

    extraStopCommands = ''
      iptables -D OUTPUT -j exam-egress 2>/dev/null || true
      iptables -F exam-egress 2>/dev/null || true
      iptables -X exam-egress 2>/dev/null || true
      ip6tables -D OUTPUT -j exam-egress 2>/dev/null || true
      ip6tables -F exam-egress 2>/dev/null || true
      ip6tables -X exam-egress 2>/dev/null || true
    '';
  };

  # Resolve the allowed hosts once DNS works and whitelist their IPs.
  systemd.services.exam-whitelist = {
    description = "Whitelist ${allowedHostsList} IPs in the egress firewall";
    wantedBy = [ "multi-user.target" ];
    after = [
      "firewall.service"
      "network-online.target"
    ];
    wants = [ "network-online.target" ];
    path = with pkgs; [
      getent
      gawk
      coreutils
      iptables
    ];
    serviceConfig.Type = "oneshot";
    script = ''
      set -u

      resolved_any=0
      for host in ${lib.escapeShellArgs allowedHosts}; do
        ips=""
        for i in $(seq 1 60); do
          ips=$(getent ahostsv4 "$host" | awk '{ print $1 }' | sort -u)
          [ -n "$ips" ] && break
          sleep 2
        done

        if [ -z "$ips" ]; then
          echo "WARNING: could not resolve $host; its traffic stays blocked" >&2
          continue
        fi

        echo "Whitelisting $host: $ips"
        for ip in $ips; do
          iptables -C exam-egress -d "$ip" -p tcp -m multiport --dports 80,443 -j ACCEPT 2>/dev/null \
            || iptables -I exam-egress -d "$ip" -p tcp -m multiport --dports 80,443 -j ACCEPT
        done
        resolved_any=1
      done

      if [ "$resolved_any" -eq 0 ]; then
        echo "WARNING: could not resolve any of ${allowedHostsList}; everything stays blocked" >&2
        exit 1
      fi
    '';
  };

  # Re-resolve periodically in case the site's IPs change mid-session.
  systemd.timers.exam-whitelist = {
    wantedBy = [ "timers.target" ];
    timerConfig.OnUnitActiveSec = "5min";
  };
}
