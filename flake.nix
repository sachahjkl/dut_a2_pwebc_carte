{
  description = "Paris public toilets static website";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachSystem
      [
        "x86_64-linux"
        "aarch64-linux"
      ]
      (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          pname = "dut-a2-pwebc-carte";
          version = "0.0.0";
          src = pkgs.lib.cleanSource ./.;
          npmDeps = pkgs.fetchNpmDeps {
            inherit src;
            hash = "sha256-MoDiYiH++CUUuGZYel47psMewHl8PpYlo0liuouibM4=";
          };

          site = pkgs.buildNpmPackage {
            inherit
              pname
              version
              src
              npmDeps
              ;
            nodejs = pkgs.nodejs_22;
            dontNpmBuild = true;
            installPhase = ''
              runHook preInstall
              mkdir -p $out
              cp -r css imgs scripts index.html $out/
              runHook postInstall
            '';
          };

          mkCheck =
            name: command:
            pkgs.buildNpmPackage {
              inherit
                pname
                version
                src
                npmDeps
                ;
              name = "${pname}-${name}";
              nodejs = pkgs.nodejs_22;
              dontNpmBuild = true;
              installPhase = ''
                runHook preInstall
                ${command}
                touch $out
                runHook postInstall
              '';
            };

          actionlint = pkgs.runCommand "${pname}-actionlint" { nativeBuildInputs = [ pkgs.actionlint ]; } ''
            actionlint -config-file ${src}/.github/actionlint.yaml ${src}/.github/workflows/*.yml
            touch $out
          '';
        in
        {
          packages.default = site;

          checks = {
            inherit actionlint;
            format = mkCheck "format" "npm run format:check";
            lint = mkCheck "lint" "npm run lint";
            package = site;
          };

          devShells.default = pkgs.mkShell {
            packages = [ pkgs.nodejs_22 ];
          };

          formatter = pkgs.nixfmt-tree;
        }
      );
}
