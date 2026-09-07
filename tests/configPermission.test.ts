import { describe, expect, it } from "vitest";
import { NATIVE_MINT, NATIVE_MINT_2022 } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
import {
  ConfigPermission,
  isConfigPermissionAllow,
  UnsupportedNativeMintToken2022Error,
  validateNotNativeMintToken2022,
  validateTokenMints,
} from "../src";
import BN from "bn.js";

describe("ConfigPermission", () => {
  it("isConfigPermissionAllow matches Config::is_permission_allow", () => {
    const none = new BN(0);
    const bypass = new BN(1).shln(
      ConfigPermission.CreatePoolWithoutMintValidation,
    );

    expect(
      isConfigPermissionAllow(
        none,
        ConfigPermission.CreatePoolWithoutMintValidation,
      ),
    ).toBe(false);
    expect(
      isConfigPermissionAllow(
        bypass,
        ConfigPermission.CreatePoolWithoutMintValidation,
      ),
    ).toBe(true);
  });
});

describe("Token-2022 native mint", () => {
  it("rejects NATIVE_MINT_2022 and allows SPL wrapped SOL", () => {
    expect(() => validateNotNativeMintToken2022(NATIVE_MINT_2022)).toThrow(
      UnsupportedNativeMintToken2022Error,
    );
    expect(() => validateNotNativeMintToken2022(NATIVE_MINT)).not.toThrow();
  });

  it("validateTokenMints rejects NATIVE_MINT_2022 on either side", () => {
    const otherMint = Keypair.generate().publicKey;

    expect(() => validateTokenMints(NATIVE_MINT_2022, otherMint)).toThrow(
      UnsupportedNativeMintToken2022Error,
    );
    expect(() => validateTokenMints(otherMint, NATIVE_MINT_2022)).toThrow(
      UnsupportedNativeMintToken2022Error,
    );
    expect(() => validateTokenMints(NATIVE_MINT, otherMint)).not.toThrow();
  });
});
