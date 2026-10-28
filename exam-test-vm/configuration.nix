{ pkgs, ... }:

let
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
  vscodeWithExtension = pkgs.vscode-with-extensions.override {
    vscodeExtensions = [
      pkgs.vscode-extensions.ms-python.python
      myCustomExtension
    ];
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
  ];

  # ------------------------------------------------------------------
  # Egress firewall: only exam.jutge.org (plus DNS/DHCP) is reachable.
  #
  # Two stages, because firewall.service runs *before* networking/DNS
  # are up at boot:
  #  1. extraCommands (early boot): install a fail-CLOSED policy that
  #     does not depend on DNS (allow loopback, DNS, DHCP; reject rest).
  #  2. exam-whitelist.service (after network is online): resolve
  #     exam.jutge.org, retrying until it succeeds, and whitelist its IPs.
  # ------------------------------------------------------------------
  networking.firewall = {
    enable = true;

    extraCommands = ''
      # IPv4 egress chain
      iptables -N exam-egress 2>/dev/null || true
      iptables -F exam-egress
      iptables -A exam-egress -o lo -j ACCEPT
      iptables -A exam-egress -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
      iptables -A exam-egress -p udp --dport 53 -j ACCEPT # DNS (needed to resolve exam.jutge.org)
      iptables -A exam-egress -p tcp --dport 53 -j ACCEPT
      iptables -A exam-egress -p udp --dport 67:68 -j ACCEPT # DHCP renewals
      # ACCEPT rules for exam.jutge.org are inserted above the REJECT
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

  # Resolve exam.jutge.org once DNS works and whitelist its IPs.
  systemd.services.exam-whitelist = {
    description = "Whitelist exam.jutge.org IPs in the egress firewall";
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

      ips=""
      for i in $(seq 1 60); do
        ips=$(getent ahostsv4 exam.jutge.org | awk '{ print $1 }' | sort -u)
        [ -n "$ips" ] && break
        sleep 2
      done

      if [ -z "$ips" ]; then
        echo "WARNING: could not resolve exam.jutge.org; everything stays blocked" >&2
        exit 1
      fi

      echo "Whitelisting exam.jutge.org: $ips"
      for ip in $ips; do
        iptables -C exam-egress -d "$ip" -p tcp -m multiport --dports 80,443 -j ACCEPT 2>/dev/null \
          || iptables -I exam-egress -d "$ip" -p tcp -m multiport --dports 80,443 -j ACCEPT
      done
    '';
  };

  # Re-resolve periodically in case the site's IPs change mid-session.
  systemd.timers.exam-whitelist = {
    wantedBy = [ "timers.target" ];
    timerConfig.OnUnitActiveSec = "5min";
  };
}
