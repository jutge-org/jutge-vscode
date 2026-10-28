{
  description = "Isolated Exam Environment VM for VSCode Extension Testing";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }: {
    nixosConfigurations.exam-vm = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        {
          # QEMU VM specific hardware specs
          # (these options are only defined inside the `vmVariant` submodule,
          #  which is what `config.system.build.vm` is built from)
          virtualisation.vmVariant.virtualisation = {
            memorySize = 4096; # Allocate 4GB RAM
            cores = 4;         # Allocate 4 CPU Cores
            graphics = true;   # Enable Graphical Output
            resolution = {
              x = 1920;
              y = 1080;
            };
          };
        }
      ];
    };

    # Package output allowing immediate `nix run` execution
    apps.x86_64-linux.default = {
      type = "app";
      program = "${self.nixosConfigurations.exam-vm.config.system.build.vm}/bin/run-exam-vm-vm";
    };
  };
}
