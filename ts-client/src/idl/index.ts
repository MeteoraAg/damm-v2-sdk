export type CpAmm = {
  version: "0.1.0";
  name: "cp_amm";
  instructions: [
    {
      name: "createConfig";
      docs: ["ADMIN FUNCTIONS ////"];
      accounts: [
        {
          name: "config";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "configParameters";
          type: {
            defined: "ConfigParameters";
          };
        }
      ];
    },
    {
      name: "createTokenBadge";
      accounts: [
        {
          name: "tokenBadge";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "createClaimFeeOperator";
      accounts: [
        {
          name: "claimFeeOperator";
          isMut: true;
          isSigner: false;
        },
        {
          name: "operator";
          isMut: false;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "closeClaimFeeOperator";
      accounts: [
        {
          name: "claimFeeOperator";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rentReceiver";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "closeConfig";
      accounts: [
        {
          name: "config";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "rentReceiver";
          isMut: true;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "initializeReward";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        },
        {
          name: "rewardDuration";
          type: "u64";
        },
        {
          name: "funder";
          type: "publicKey";
        }
      ];
    },
    {
      name: "fundReward";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "funderTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "funder";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        },
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "carryForward";
          type: "bool";
        }
      ];
    },
    {
      name: "withdrawIneligibleReward";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardVault";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "funderTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "funder";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        }
      ];
    },
    {
      name: "updateRewardFunder";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        },
        {
          name: "newFunder";
          type: "publicKey";
        }
      ];
    },
    {
      name: "updateRewardDuration";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        },
        {
          name: "newDuration";
          type: "u64";
        }
      ];
    },
    {
      name: "setPoolStatus";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "admin";
          isMut: false;
          isSigner: true;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "status";
          type: "u8";
        }
      ];
    },
    {
      name: "claimProtocolFee";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "tokenAAccount";
          isMut: true;
          isSigner: false;
          docs: ["The treasury token a account"];
        },
        {
          name: "tokenBAccount";
          isMut: true;
          isSigner: false;
          docs: ["The treasury token b account"];
        },
        {
          name: "claimFeeOperator";
          isMut: false;
          isSigner: false;
          docs: ["Claim fee operator"];
        },
        {
          name: "operator";
          isMut: false;
          isSigner: true;
          docs: ["Operator"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "claimPartnerFee";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAAccount";
          isMut: true;
          isSigner: false;
          docs: ["The treasury token a account"];
        },
        {
          name: "tokenBAccount";
          isMut: true;
          isSigner: false;
          docs: ["The treasury token b account"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "partner";
          isMut: false;
          isSigner: true;
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "maxAmountA";
          type: "u64";
        },
        {
          name: "maxAmountB";
          type: "u64";
        }
      ];
    },
    {
      name: "initializePool";
      docs: ["USER FUNCTIONS ////"];
      accounts: [
        {
          name: "creator";
          isMut: false;
          isSigner: false;
        },
        {
          name: "positionNftMint";
          isMut: true;
          isSigner: true;
          docs: ["Unique token mint address, initialize in contract"];
        },
        {
          name: "positionNftAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
          docs: ["Address paying to create the pool. Can be anyone"];
        },
        {
          name: "config";
          isMut: false;
          isSigner: false;
          docs: ["Which config the pool belongs to."];
        },
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
          docs: ["Initialize an account to store the pool state"];
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["Token a mint"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["Token b mint"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["Token a vault for the pool"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["Token b vault for the pool"];
        },
        {
          name: "payerTokenA";
          isMut: true;
          isSigner: false;
          docs: ["payer token a account"];
        },
        {
          name: "payerTokenB";
          isMut: true;
          isSigner: false;
          docs: ["creator token b account"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Program to create mint account and mint tokens"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Program to create mint account and mint tokens"];
        },
        {
          name: "token2022Program";
          isMut: false;
          isSigner: false;
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "InitializePoolParameters";
          };
        }
      ];
    },
    {
      name: "initializeCustomizablePool";
      accounts: [
        {
          name: "creator";
          isMut: false;
          isSigner: false;
        },
        {
          name: "positionNftMint";
          isMut: true;
          isSigner: true;
          docs: ["Unique token mint address, initialize in contract"];
        },
        {
          name: "positionNftAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
          docs: ["Address paying to create the pool. Can be anyone"];
        },
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
          docs: ["Initialize an account to store the pool state"];
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["Token a mint"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["Token b mint"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["Token a vault for the pool"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["Token b vault for the pool"];
        },
        {
          name: "payerTokenA";
          isMut: true;
          isSigner: false;
          docs: ["payer token a account"];
        },
        {
          name: "payerTokenB";
          isMut: true;
          isSigner: false;
          docs: ["creator token b account"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Program to create mint account and mint tokens"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Program to create mint account and mint tokens"];
        },
        {
          name: "token2022Program";
          isMut: false;
          isSigner: false;
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "InitializeCustomizablePoolParameters";
          };
        }
      ];
    },
    {
      name: "createPosition";
      accounts: [
        {
          name: "owner";
          isMut: false;
          isSigner: false;
        },
        {
          name: "positionNftMint";
          isMut: true;
          isSigner: true;
          docs: ["Unique token mint address, initialize in contract"];
        },
        {
          name: "positionNftAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
          docs: ["Address paying to create the position. Can be anyone"];
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account"
          ];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "addLiquidity";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token a account"];
        },
        {
          name: "tokenBAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token b account"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "AddLiquidityParameters";
          };
        }
      ];
    },
    {
      name: "removeLiquidity";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token a account"];
        },
        {
          name: "tokenBAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token b account"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "RemoveLiquidityParameters";
          };
        }
      ];
    },
    {
      name: "swap";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
          docs: ["Pool account"];
        },
        {
          name: "inputTokenAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token account for input token"];
        },
        {
          name: "outputTokenAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token account for output token"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "payer";
          isMut: false;
          isSigner: true;
          docs: ["The user performing the swap"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "referralTokenAccount";
          isMut: true;
          isSigner: false;
          isOptional: true;
          docs: ["referral token account"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "SwapParameters";
          };
        }
      ];
    },
    {
      name: "claimPositionFee";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: false;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenAAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token a account"];
        },
        {
          name: "tokenBAccount";
          isMut: true;
          isSigner: false;
          docs: ["The user token b account"];
        },
        {
          name: "tokenAVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for input token"];
        },
        {
          name: "tokenBVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for output token"];
        },
        {
          name: "tokenAMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token a"];
        },
        {
          name: "tokenBMint";
          isMut: false;
          isSigner: false;
          docs: ["The mint of token b"];
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "tokenAProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token a program"];
        },
        {
          name: "tokenBProgram";
          isMut: false;
          isSigner: false;
          docs: ["Token b program"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "lockPosition";
      accounts: [
        {
          name: "pool";
          isMut: false;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "vesting";
          isMut: true;
          isSigner: true;
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "params";
          type: {
            defined: "VestingParameters";
          };
        }
      ];
    },
    {
      name: "refreshVesting";
      accounts: [
        {
          name: "pool";
          isMut: false;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "permanentLockPosition";
      accounts: [
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "permanentLockLiquidity";
          type: "u128";
        }
      ];
    },
    {
      name: "claimReward";
      accounts: [
        {
          name: "poolAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "pool";
          isMut: true;
          isSigner: false;
        },
        {
          name: "position";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rewardVault";
          isMut: true;
          isSigner: false;
          docs: ["The vault token account for reward token"];
        },
        {
          name: "rewardMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "userTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "positionNftAccount";
          isMut: false;
          isSigner: false;
          docs: ["The token account for nft"];
        },
        {
          name: "owner";
          isMut: false;
          isSigner: true;
          docs: ["owner of position"];
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "eventAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "program";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "rewardIndex";
          type: "u8";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "claimFeeOperator";
      docs: ["Parameter that set by the protocol"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "operator";
            docs: ["operator"];
            type: "publicKey";
          },
          {
            name: "padding";
            docs: ["Reserve"];
            type: {
              array: ["u8", 128];
            };
          }
        ];
      };
    },
    {
      name: "config";
      type: {
        kind: "struct";
        fields: [
          {
            name: "vaultConfigKey";
            docs: ["Vault config key"];
            type: "publicKey";
          },
          {
            name: "poolCreatorAuthority";
            docs: [
              "Only pool_creator_authority can use the current config to initialize new pool. When it's Pubkey::default, it's a public config."
            ];
            type: "publicKey";
          },
          {
            name: "poolFees";
            docs: ["Pool fee"];
            type: {
              defined: "PoolFeesConfig";
            };
          },
          {
            name: "activationType";
            docs: ["Activation type"];
            type: "u8";
          },
          {
            name: "collectFeeMode";
            docs: ["Collect fee mode"];
            type: "u8";
          },
          {
            name: "padding0";
            docs: ["padding 0"];
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "index";
            docs: ["config index"];
            type: "u64";
          },
          {
            name: "sqrtMinPrice";
            docs: ["sqrt min price"];
            type: "u128";
          },
          {
            name: "sqrtMaxPrice";
            docs: ["sqrt max price"];
            type: "u128";
          },
          {
            name: "padding1";
            docs: ["Fee curve point", "Padding for further use"];
            type: {
              array: ["u64", 10];
            };
          }
        ];
      };
    },
    {
      name: "pool";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolFees";
            docs: ["Pool fee"];
            type: {
              defined: "PoolFeesStruct";
            };
          },
          {
            name: "tokenAMint";
            docs: ["token a mint"];
            type: "publicKey";
          },
          {
            name: "tokenBMint";
            docs: ["token b mint"];
            type: "publicKey";
          },
          {
            name: "tokenAVault";
            docs: ["token a vault"];
            type: "publicKey";
          },
          {
            name: "tokenBVault";
            docs: ["token b vault"];
            type: "publicKey";
          },
          {
            name: "whitelistedVault";
            docs: [
              "Whitelisted vault to be able to buy pool before activation_point"
            ];
            type: "publicKey";
          },
          {
            name: "partner";
            docs: ["partner"];
            type: "publicKey";
          },
          {
            name: "liquidity";
            docs: ["liquidity share"];
            type: "u128";
          },
          {
            name: "tokenAReserve";
            docs: ["token a reserve"];
            type: "u64";
          },
          {
            name: "tokenBReserve";
            docs: ["token b reserve"];
            type: "u64";
          },
          {
            name: "protocolAFee";
            docs: ["protocol a fee"];
            type: "u64";
          },
          {
            name: "protocolBFee";
            docs: ["protocol b fee"];
            type: "u64";
          },
          {
            name: "partnerAFee";
            docs: ["partner a fee"];
            type: "u64";
          },
          {
            name: "partnerBFee";
            docs: ["partner b fee"];
            type: "u64";
          },
          {
            name: "sqrtMinPrice";
            docs: ["min price"];
            type: "u128";
          },
          {
            name: "sqrtMaxPrice";
            docs: ["max price"];
            type: "u128";
          },
          {
            name: "sqrtPrice";
            docs: ["current price"];
            type: "u128";
          },
          {
            name: "activationPoint";
            docs: ["Activation point, can be slot or timestamp"];
            type: "u64";
          },
          {
            name: "activationType";
            docs: ["Activation type, 0 means by slot, 1 means by timestamp"];
            type: "u8";
          },
          {
            name: "poolStatus";
            docs: ["pool status, 0: enable, 1 disable"];
            type: "u8";
          },
          {
            name: "tokenAFlag";
            docs: ["token a flag"];
            type: "u8";
          },
          {
            name: "tokenBFlag";
            docs: ["token b flag"];
            type: "u8";
          },
          {
            name: "collectFeeMode";
            docs: [
              "0 is collect fee in both token, 1 only collect fee in token a, 2 only collect fee in token b"
            ];
            type: "u8";
          },
          {
            name: "poolType";
            docs: ["pool type"];
            type: "u8";
          },
          {
            name: "padding0";
            docs: ["padding"];
            type: {
              array: ["u8", 2];
            };
          },
          {
            name: "feeAPerLiquidity";
            docs: ["cumulative"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "feeBPerLiquidity";
            docs: ["cumulative"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "permanentLockLiquidity";
            type: "u128";
          },
          {
            name: "metrics";
            docs: ["metrics"];
            type: {
              defined: "PoolMetrics";
            };
          },
          {
            name: "rewardInfos";
            docs: ["Farming reward information"];
            type: {
              array: [
                {
                  defined: "RewardInfo";
                },
                2
              ];
            };
          },
          {
            name: "padding1";
            docs: ["Padding for further use"];
            type: {
              array: ["u64", 10];
            };
          }
        ];
      };
    },
    {
      name: "position";
      type: {
        kind: "struct";
        fields: [
          {
            name: "pool";
            type: "publicKey";
          },
          {
            name: "nftMint";
            docs: ["nft mint"];
            type: "publicKey";
          },
          {
            name: "feeAPerTokenCheckpoint";
            docs: ["fee a checkpoint"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "feeBPerTokenCheckpoint";
            docs: ["fee b checkpoint"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "feeAPending";
            docs: ["fee a pending"];
            type: "u64";
          },
          {
            name: "feeBPending";
            docs: ["fee b pending"];
            type: "u64";
          },
          {
            name: "unlockedLiquidity";
            docs: ["unlock liquidity"];
            type: "u128";
          },
          {
            name: "vestedLiquidity";
            docs: ["vesting liquidity"];
            type: "u128";
          },
          {
            name: "permanentLockedLiquidity";
            docs: ["permanent locked liquidity"];
            type: "u128";
          },
          {
            name: "metrics";
            docs: ["metrics"];
            type: {
              defined: "PositionMetrics";
            };
          },
          {
            name: "rewardInfos";
            docs: ["Farming reward information"];
            type: {
              array: [
                {
                  defined: "UserRewardInfo";
                },
                2
              ];
            };
          },
          {
            name: "feeClaimer";
            docs: ["Fee claimer for this position"];
            type: "publicKey";
          },
          {
            name: "padding";
            docs: ["padding for future usage"];
            type: {
              array: ["u128", 4];
            };
          }
        ];
      };
    },
    {
      name: "tokenBadge";
      docs: ["Parameter that set by the protocol"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "tokenMint";
            docs: ["token mint"];
            type: "publicKey";
          },
          {
            name: "padding";
            docs: ["Reserve"];
            type: {
              array: ["u8", 128];
            };
          }
        ];
      };
    },
    {
      name: "vesting";
      type: {
        kind: "struct";
        fields: [
          {
            name: "position";
            type: "publicKey";
          },
          {
            name: "cliffPoint";
            type: "u64";
          },
          {
            name: "periodFrequency";
            type: "u64";
          },
          {
            name: "cliffUnlockLiquidity";
            type: "u128";
          },
          {
            name: "liquidityPerPeriod";
            type: "u128";
          },
          {
            name: "totalReleasedLiquidity";
            type: "u128";
          },
          {
            name: "numberOfPeriod";
            type: "u16";
          },
          {
            name: "padding";
            type: {
              array: ["u8", 14];
            };
          },
          {
            name: "padding2";
            type: {
              array: ["u128", 4];
            };
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "ConfigParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolFees";
            type: {
              defined: "PoolFeeParamters";
            };
          },
          {
            name: "sqrtMinPrice";
            type: "u128";
          },
          {
            name: "sqrtMaxPrice";
            type: "u128";
          },
          {
            name: "vaultConfigKey";
            type: "publicKey";
          },
          {
            name: "poolCreatorAuthority";
            type: "publicKey";
          },
          {
            name: "activationType";
            type: "u8";
          },
          {
            name: "collectFeeMode";
            type: "u8";
          },
          {
            name: "index";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "InitializeCustomizablePoolParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolFees";
            docs: ["pool fees"];
            type: {
              defined: "PoolFeeParamters";
            };
          },
          {
            name: "sqrtMinPrice";
            docs: ["sqrt min price"];
            type: "u128";
          },
          {
            name: "sqrtMaxPrice";
            docs: ["sqrt max price"];
            type: "u128";
          },
          {
            name: "hasAlphaVault";
            docs: ["has alpha vault"];
            type: "bool";
          },
          {
            name: "liquidity";
            docs: ["initialize liquidity"];
            type: "u128";
          },
          {
            name: "sqrtPrice";
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value"
            ];
            type: "u128";
          },
          {
            name: "activationType";
            docs: ["activation type"];
            type: "u8";
          },
          {
            name: "collectFeeMode";
            docs: ["collect fee mode"];
            type: "u8";
          },
          {
            name: "activationPoint";
            docs: ["activation point"];
            type: {
              option: "u64";
            };
          }
        ];
      };
    },
    {
      name: "InitializePoolParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "liquidity";
            docs: ["initialize liquidity"];
            type: "u128";
          },
          {
            name: "sqrtPrice";
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value"
            ];
            type: "u128";
          },
          {
            name: "activationPoint";
            docs: ["activation point"];
            type: {
              option: "u64";
            };
          }
        ];
      };
    },
    {
      name: "AddLiquidityParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "liquidityDelta";
            docs: ["delta liquidity"];
            type: "u128";
          },
          {
            name: "tokenAAmountThreshold";
            docs: ["maximum token a amount"];
            type: "u64";
          },
          {
            name: "tokenBAmountThreshold";
            docs: ["maximum token b amount"];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "VestingParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cliffPoint";
            type: {
              option: "u64";
            };
          },
          {
            name: "periodFrequency";
            type: "u64";
          },
          {
            name: "cliffUnlockLiquidity";
            type: "u128";
          },
          {
            name: "liquidityPerPeriod";
            type: "u128";
          },
          {
            name: "numberOfPeriod";
            type: "u16";
          },
          {
            name: "index";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "RemoveLiquidityParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "maxLiquidityDelta";
            docs: ["delta liquidity"];
            type: "u128";
          },
          {
            name: "tokenAAmountThreshold";
            docs: ["minimum token a amount"];
            type: "u64";
          },
          {
            name: "tokenBAmountThreshold";
            docs: ["minimum token b amount"];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "SwapParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amountIn";
            type: "u64";
          },
          {
            name: "minimumAmountOut";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "PoolFeeParamters";
      docs: ["Information regarding fee charges"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "baseFee";
            docs: ["Base fee"];
            type: {
              defined: "BaseFeeParameters";
            };
          },
          {
            name: "protocolFeePercent";
            docs: ["Protocol trade fee percent"];
            type: "u8";
          },
          {
            name: "partnerFeePercent";
            docs: ["partner fee percent"];
            type: "u8";
          },
          {
            name: "referralFeePercent";
            docs: ["referral fee percent"];
            type: "u8";
          },
          {
            name: "dynamicFee";
            docs: ["dynamic fee"];
            type: {
              option: {
                defined: "DynamicFeeParameters";
              };
            };
          }
        ];
      };
    },
    {
      name: "BaseFeeParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cliffFeeNumerator";
            type: "u64";
          },
          {
            name: "numberOfPeriod";
            type: "u16";
          },
          {
            name: "periodFrequency";
            type: "u64";
          },
          {
            name: "reductionFactor";
            type: "u64";
          },
          {
            name: "feeSchedulerMode";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "DynamicFeeParameters";
      type: {
        kind: "struct";
        fields: [
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "binStepU128";
            type: "u128";
          },
          {
            name: "filterPeriod";
            type: "u16";
          },
          {
            name: "decayPeriod";
            type: "u16";
          },
          {
            name: "reductionFactor";
            type: "u16";
          },
          {
            name: "maxVolatilityAccumulator";
            type: "u32";
          },
          {
            name: "variableFeeControl";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "PartnerInfo";
      type: {
        kind: "struct";
        fields: [
          {
            name: "feePercent";
            type: "u8";
          },
          {
            name: "partnerAuthority";
            type: "publicKey";
          },
          {
            name: "pendingFeeA";
            type: "u64";
          },
          {
            name: "pendingFeeB";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "PoolFeesConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "baseFee";
            type: {
              defined: "BaseFeeConfig";
            };
          },
          {
            name: "protocolFeePercent";
            type: "u8";
          },
          {
            name: "partnerFeePercent";
            type: "u8";
          },
          {
            name: "referralFeePercent";
            type: "u8";
          },
          {
            name: "padding0";
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "dynamicFee";
            docs: ["dynamic fee"];
            type: {
              defined: "DynamicFeeConfig";
            };
          },
          {
            name: "padding1";
            type: {
              array: ["u64", 2];
            };
          }
        ];
      };
    },
    {
      name: "BaseFeeConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cliffFeeNumerator";
            type: "u64";
          },
          {
            name: "feeSchedulerMode";
            type: "u8";
          },
          {
            name: "padding";
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "numberOfPeriod";
            type: "u16";
          },
          {
            name: "periodFrequency";
            type: "u64";
          },
          {
            name: "reductionFactor";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "DynamicFeeConfig";
      type: {
        kind: "struct";
        fields: [
          {
            name: "initialized";
            type: "u8";
          },
          {
            name: "padding";
            type: {
              array: ["u8", 7];
            };
          },
          {
            name: "maxVolatilityAccumulator";
            type: "u32";
          },
          {
            name: "variableFeeControl";
            type: "u32";
          },
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "filterPeriod";
            type: "u16";
          },
          {
            name: "decayPeriod";
            type: "u16";
          },
          {
            name: "reductionFactor";
            type: "u16";
          },
          {
            name: "binStepU128";
            type: "u128";
          }
        ];
      };
    },
    {
      name: "PoolFeesStruct";
      docs: [
        "Information regarding fee charges",
        "trading_fee = amount * trade_fee_numerator / denominator",
        "protocol_fee = trading_fee * protocol_fee_percentage / 100",
        "referral_fee = protocol_fee * referral_percentage / 100",
        "partner_fee = (protocol_fee - referral_fee) * partner_fee_percentage / denominator"
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "baseFee";
            docs: [
              "Trade fees are extra token amounts that are held inside the token",
              "accounts during a trade, making the value of liquidity tokens rise.",
              "Trade fee numerator"
            ];
            type: {
              defined: "BaseFeeStruct";
            };
          },
          {
            name: "protocolFeePercent";
            docs: [
              "Protocol trading fees are extra token amounts that are held inside the token",
              "accounts during a trade, with the equivalent in pool tokens minted to",
              "the protocol of the program.",
              "Protocol trade fee numerator"
            ];
            type: "u8";
          },
          {
            name: "partnerFeePercent";
            docs: ["partner fee"];
            type: "u8";
          },
          {
            name: "referralFeePercent";
            docs: ["referral fee"];
            type: "u8";
          },
          {
            name: "padding0";
            docs: ["padding"];
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "dynamicFee";
            docs: ["dynamic fee"];
            type: {
              defined: "DynamicFeeStruct";
            };
          },
          {
            name: "padding1";
            docs: ["padding"];
            type: {
              array: ["u64", 2];
            };
          }
        ];
      };
    },
    {
      name: "BaseFeeStruct";
      type: {
        kind: "struct";
        fields: [
          {
            name: "cliffFeeNumerator";
            type: "u64";
          },
          {
            name: "feeSchedulerMode";
            type: "u8";
          },
          {
            name: "padding0";
            type: {
              array: ["u8", 5];
            };
          },
          {
            name: "numberOfPeriod";
            type: "u16";
          },
          {
            name: "periodFrequency";
            type: "u64";
          },
          {
            name: "reductionFactor";
            type: "u64";
          },
          {
            name: "padding1";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "DynamicFeeStruct";
      type: {
        kind: "struct";
        fields: [
          {
            name: "initialized";
            type: "u8";
          },
          {
            name: "padding";
            type: {
              array: ["u8", 7];
            };
          },
          {
            name: "maxVolatilityAccumulator";
            type: "u32";
          },
          {
            name: "variableFeeControl";
            type: "u32";
          },
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "filterPeriod";
            type: "u16";
          },
          {
            name: "decayPeriod";
            type: "u16";
          },
          {
            name: "reductionFactor";
            type: "u16";
          },
          {
            name: "lastUpdateTimestamp";
            type: "u64";
          },
          {
            name: "binStepU128";
            type: "u128";
          },
          {
            name: "sqrtPriceReference";
            type: "u128";
          },
          {
            name: "volatilityAccumulator";
            type: "u128";
          },
          {
            name: "volatilityReference";
            type: "u128";
          }
        ];
      };
    },
    {
      name: "PoolMetrics";
      type: {
        kind: "struct";
        fields: [
          {
            name: "totalLpAFee";
            type: "u128";
          },
          {
            name: "totalLpBFee";
            type: "u128";
          },
          {
            name: "totalProtocolAFee";
            type: "u64";
          },
          {
            name: "totalProtocolBFee";
            type: "u64";
          },
          {
            name: "totalPartnerAFee";
            type: "u64";
          },
          {
            name: "totalPartnerBFee";
            type: "u64";
          },
          {
            name: "totalPosition";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "RewardInfo";
      docs: ["Stores the state relevant for tracking liquidity mining rewards"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "initialized";
            docs: ["Indicates if the reward has been initialized"];
            type: "u8";
          },
          {
            name: "rewardTokenFlag";
            docs: ["reward token flag"];
            type: "u8";
          },
          {
            name: "padding0";
            docs: ["padding"];
            type: {
              array: ["u8", 6];
            };
          },
          {
            name: "mint";
            docs: ["Reward token mint."];
            type: "publicKey";
          },
          {
            name: "vault";
            docs: ["Reward vault token account."];
            type: "publicKey";
          },
          {
            name: "funder";
            docs: ["Authority account that allows to fund rewards"];
            type: "publicKey";
          },
          {
            name: "rewardDuration";
            docs: ["reward duration"];
            type: "u64";
          },
          {
            name: "rewardDurationEnd";
            docs: ["reward duration end"];
            type: "u64";
          },
          {
            name: "rewardRate";
            docs: ["reward rate"];
            type: "u128";
          },
          {
            name: "rewardPerTokenStored";
            docs: ["Reward per token stored"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "lastUpdateTime";
            docs: ["The last time reward states were updated."];
            type: "u64";
          },
          {
            name: "cumulativeSecondsWithEmptyLiquidityReward";
            docs: [
              "Accumulated seconds when the farm distributed rewards but the bin was empty.",
              "These rewards will be carried over to the next reward time window."
            ];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "SwapResult";
      docs: ["Encodes all results of swapping"];
      type: {
        kind: "struct";
        fields: [
          {
            name: "outputAmount";
            type: "u64";
          },
          {
            name: "nextSqrtPrice";
            type: "u128";
          },
          {
            name: "lpFee";
            type: "u64";
          },
          {
            name: "protocolFee";
            type: "u64";
          },
          {
            name: "partnerFee";
            type: "u64";
          },
          {
            name: "referralFee";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "UserRewardInfo";
      type: {
        kind: "struct";
        fields: [
          {
            name: "rewardPerTokenCheckpoint";
            docs: ["The latest update reward checkpoint"];
            type: {
              array: ["u8", 32];
            };
          },
          {
            name: "rewardPendings";
            docs: ["Current pending rewards"];
            type: "u64";
          },
          {
            name: "totalClaimedRewards";
            docs: ["Total claimed rewards"];
            type: "u64";
          }
        ];
      };
    },
    {
      name: "PositionMetrics";
      type: {
        kind: "struct";
        fields: [
          {
            name: "totalClaimedAFee";
            type: "u64";
          },
          {
            name: "totalClaimedBFee";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "Rounding";
      docs: ["Round up, down"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Up";
          },
          {
            name: "Down";
          }
        ];
      };
    },
    {
      name: "TradeDirection";
      docs: ["Trade (swap) direction"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "AtoB";
          },
          {
            name: "BtoA";
          }
        ];
      };
    },
    {
      name: "ActivationType";
      docs: ["Type of the activation"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Slot";
          },
          {
            name: "Timestamp";
          }
        ];
      };
    },
    {
      name: "FeeSchedulerMode";
      docs: ["collect fee mode"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Linear";
          },
          {
            name: "Exponential";
          }
        ];
      };
    },
    {
      name: "CollectFeeMode";
      docs: ["collect fee mode"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "BothToken";
          },
          {
            name: "OnlyB";
          }
        ];
      };
    },
    {
      name: "PoolStatus";
      docs: ["collect fee mode"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Enable";
          },
          {
            name: "Disable";
          }
        ];
      };
    },
    {
      name: "PoolType";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Permissionless";
          },
          {
            name: "Customizable";
          }
        ];
      };
    },
    {
      name: "ActivationType";
      docs: ["Type of the activation"];
      type: {
        kind: "enum";
        variants: [
          {
            name: "Slot";
          },
          {
            name: "Timestamp";
          }
        ];
      };
    },
    {
      name: "TokenProgramFlags";
      type: {
        kind: "enum";
        variants: [
          {
            name: "TokenProgram";
          },
          {
            name: "TokenProgram2022";
          }
        ];
      };
    }
  ];
  events: [
    {
      name: "EvtCloseConfig";
      fields: [
        {
          name: "config";
          type: "publicKey";
          index: false;
        },
        {
          name: "admin";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtCreateConfig";
      fields: [
        {
          name: "poolFees";
          type: {
            defined: "PoolFeeParamters";
          };
          index: false;
        },
        {
          name: "vaultConfigKey";
          type: "publicKey";
          index: false;
        },
        {
          name: "poolCreatorAuthority";
          type: "publicKey";
          index: false;
        },
        {
          name: "activationType";
          type: "u8";
          index: false;
        },
        {
          name: "sqrtMinPrice";
          type: "u128";
          index: false;
        },
        {
          name: "sqrtMaxPrice";
          type: "u128";
          index: false;
        },
        {
          name: "collectFeeMode";
          type: "u8";
          index: false;
        },
        {
          name: "index";
          type: "u64";
          index: false;
        },
        {
          name: "config";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtCreateTokenBadge";
      fields: [
        {
          name: "tokenMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtCreateClaimFeeOperator";
      fields: [
        {
          name: "operator";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtCloseClaimFeeOperator";
      fields: [
        {
          name: "claimFeeOperator";
          type: "publicKey";
          index: false;
        },
        {
          name: "operator";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtInitializePool";
      fields: [
        {
          name: "tokenAMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "tokenBMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "creator";
          type: "publicKey";
          index: false;
        },
        {
          name: "payer";
          type: "publicKey";
          index: false;
        },
        {
          name: "alphaVault";
          type: "publicKey";
          index: false;
        },
        {
          name: "poolFees";
          type: {
            defined: "PoolFeeParamters";
          };
          index: false;
        },
        {
          name: "sqrtMinPrice";
          type: "u128";
          index: false;
        },
        {
          name: "sqrtMaxPrice";
          type: "u128";
          index: false;
        },
        {
          name: "activationType";
          type: "u8";
          index: false;
        },
        {
          name: "collectFeeMode";
          type: "u8";
          index: false;
        },
        {
          name: "liquidity";
          type: "u128";
          index: false;
        },
        {
          name: "sqrtPrice";
          type: "u128";
          index: false;
        },
        {
          name: "activationPoint";
          type: "u64";
          index: false;
        },
        {
          name: "tokenAFlag";
          type: "u8";
          index: false;
        },
        {
          name: "tokenBFlag";
          type: "u8";
          index: false;
        },
        {
          name: "totalAmountA";
          type: "u64";
          index: false;
        },
        {
          name: "totalAmountB";
          type: "u64";
          index: false;
        },
        {
          name: "poolType";
          type: "u8";
          index: false;
        }
      ];
    },
    {
      name: "EvtAddLiquidity";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "params";
          type: {
            defined: "AddLiquidityParameters";
          };
          index: false;
        },
        {
          name: "totalAmountA";
          type: "u64";
          index: false;
        },
        {
          name: "totalAmountB";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtClaimPositionFee";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "feeAClaimed";
          type: "u64";
          index: false;
        },
        {
          name: "feeBClaimed";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtCreatePosition";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "positionNftMint";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtRemoveLiquidity";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "params";
          type: {
            defined: "RemoveLiquidityParameters";
          };
          index: false;
        },
        {
          name: "amountA";
          type: "u64";
          index: false;
        },
        {
          name: "amountB";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtSwap";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "tradeDirection";
          type: "u8";
          index: false;
        },
        {
          name: "isReferral";
          type: "bool";
          index: false;
        },
        {
          name: "params";
          type: {
            defined: "SwapParameters";
          };
          index: false;
        },
        {
          name: "swapResult";
          type: {
            defined: "SwapResult";
          };
          index: false;
        },
        {
          name: "transferFeeExcludedAmountIn";
          type: "u64";
          index: false;
        },
        {
          name: "currentTimestamp";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtLockPosition";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "vesting";
          type: "publicKey";
          index: false;
        },
        {
          name: "cliffPoint";
          type: "u64";
          index: false;
        },
        {
          name: "periodFrequency";
          type: "u64";
          index: false;
        },
        {
          name: "cliffUnlockLiquidity";
          type: "u128";
          index: false;
        },
        {
          name: "liquidityPerPeriod";
          type: "u128";
          index: false;
        },
        {
          name: "numberOfPeriod";
          type: "u16";
          index: false;
        }
      ];
    },
    {
      name: "EvtPermanentLockPosition";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "liquidity";
          type: "u128";
          index: false;
        },
        {
          name: "poolNewPermanentLockedLiquidity";
          type: "u128";
          index: false;
        }
      ];
    },
    {
      name: "EvtClaimProtocolFee";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "tokenAAmount";
          type: "u64";
          index: false;
        },
        {
          name: "tokenBAmount";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtClaimPartnerFee";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "tokenAAmount";
          type: "u64";
          index: false;
        },
        {
          name: "tokenBAmount";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtSetPoolStatus";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "status";
          type: "u8";
          index: false;
        }
      ];
    },
    {
      name: "EvtInitializeReward";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "funder";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardIndex";
          type: "u8";
          index: false;
        },
        {
          name: "rewardDuration";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtFundReward";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "funder";
          type: "publicKey";
          index: false;
        },
        {
          name: "mintReward";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardIndex";
          type: "u8";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        },
        {
          name: "transferFeeExcludedAmountIn";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtClaimReward";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "position";
          type: "publicKey";
          index: false;
        },
        {
          name: "owner";
          type: "publicKey";
          index: false;
        },
        {
          name: "mintReward";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardIndex";
          type: "u8";
          index: false;
        },
        {
          name: "totalReward";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtUpdateRewardDuration";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardIndex";
          type: "u8";
          index: false;
        },
        {
          name: "oldRewardDuration";
          type: "u64";
          index: false;
        },
        {
          name: "newRewardDuration";
          type: "u64";
          index: false;
        }
      ];
    },
    {
      name: "EvtUpdateRewardFunder";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardIndex";
          type: "u8";
          index: false;
        },
        {
          name: "oldFunder";
          type: "publicKey";
          index: false;
        },
        {
          name: "newFunder";
          type: "publicKey";
          index: false;
        }
      ];
    },
    {
      name: "EvtWithdrawIneligibleReward";
      fields: [
        {
          name: "pool";
          type: "publicKey";
          index: false;
        },
        {
          name: "rewardMint";
          type: "publicKey";
          index: false;
        },
        {
          name: "amount";
          type: "u64";
          index: false;
        }
      ];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "MathOverflow";
      msg: "Math operation overflow";
    },
    {
      code: 6001;
      name: "InvalidFee";
      msg: "Invalid fee setup";
    },
    {
      code: 6002;
      name: "InvalidInvariant";
      msg: "Invalid invariant d";
    },
    {
      code: 6003;
      name: "FeeCalculationFailure";
      msg: "Fee calculation failure";
    },
    {
      code: 6004;
      name: "ExceededSlippage";
      msg: "Exceeded slippage tolerance";
    },
    {
      code: 6005;
      name: "InvalidCalculation";
      msg: "Invalid curve calculation";
    },
    {
      code: 6006;
      name: "ZeroTradingTokens";
      msg: "Given pool token amount results in zero trading tokens";
    },
    {
      code: 6007;
      name: "ConversionError";
      msg: "Math conversion overflow";
    },
    {
      code: 6008;
      name: "FaultyLpMint";
      msg: "LP mint authority must be 'A' vault lp, without freeze authority, and 0 supply";
    },
    {
      code: 6009;
      name: "MismatchedTokenMint";
      msg: "Token mint mismatched";
    },
    {
      code: 6010;
      name: "MismatchedLpMint";
      msg: "LP mint mismatched";
    },
    {
      code: 6011;
      name: "MismatchedOwner";
      msg: "Invalid lp token owner";
    },
    {
      code: 6012;
      name: "InvalidVaultAccount";
      msg: "Invalid vault account";
    },
    {
      code: 6013;
      name: "InvalidVaultLpAccount";
      msg: "Invalid vault lp account";
    },
    {
      code: 6014;
      name: "InvalidPoolLpMintAccount";
      msg: "Invalid pool lp mint account";
    },
    {
      code: 6015;
      name: "PoolDisabled";
      msg: "Pool disabled";
    },
    {
      code: 6016;
      name: "InvalidAdminAccount";
      msg: "Invalid admin account";
    },
    {
      code: 6017;
      name: "InvalidProtocolFeeAccount";
      msg: "Invalid protocol fee account";
    },
    {
      code: 6018;
      name: "SameAdminAccount";
      msg: "Same admin account";
    },
    {
      code: 6019;
      name: "IdenticalSourceDestination";
      msg: "Identical user source and destination token account";
    },
    {
      code: 6020;
      name: "ApyCalculationError";
      msg: "Apy calculation error";
    },
    {
      code: 6021;
      name: "InsufficientSnapshot";
      msg: "Insufficient virtual price snapshot";
    },
    {
      code: 6022;
      name: "NonUpdatableCurve";
      msg: "Current curve is non-updatable";
    },
    {
      code: 6023;
      name: "MisMatchedCurve";
      msg: "New curve is mismatched with old curve";
    },
    {
      code: 6024;
      name: "InvalidAmplification";
      msg: "Amplification is invalid";
    },
    {
      code: 6025;
      name: "UnsupportedOperation";
      msg: "Operation is not supported";
    },
    {
      code: 6026;
      name: "ExceedMaxAChanges";
      msg: "Exceed max amplification changes";
    },
    {
      code: 6027;
      name: "InvalidRemainingAccountsLen";
      msg: "Invalid remaining accounts length";
    },
    {
      code: 6028;
      name: "InvalidRemainingAccounts";
      msg: "Invalid remaining account";
    },
    {
      code: 6029;
      name: "MismatchedDepegMint";
      msg: "Token mint B doesn't matches depeg type token mint";
    },
    {
      code: 6030;
      name: "InvalidApyAccount";
      msg: "Invalid APY account";
    },
    {
      code: 6031;
      name: "InvalidTokenMultiplier";
      msg: "Invalid token multiplier";
    },
    {
      code: 6032;
      name: "InvalidDepegInformation";
      msg: "Invalid depeg information";
    },
    {
      code: 6033;
      name: "UpdateTimeConstraint";
      msg: "Update time constraint violated";
    },
    {
      code: 6034;
      name: "ExceedMaxFeeBps";
      msg: "Exceeded max fee bps";
    },
    {
      code: 6035;
      name: "InvalidAdmin";
      msg: "Invalid admin";
    },
    {
      code: 6036;
      name: "PoolIsNotPermissioned";
      msg: "Pool is not permissioned";
    },
    {
      code: 6037;
      name: "InvalidDepositAmount";
      msg: "Invalid deposit amount";
    },
    {
      code: 6038;
      name: "InvalidFeeOwner";
      msg: "Invalid fee owner";
    },
    {
      code: 6039;
      name: "NonDepletedPool";
      msg: "Pool is not depleted";
    },
    {
      code: 6040;
      name: "AmountNotPeg";
      msg: "Token amount is not 1:1";
    },
    {
      code: 6041;
      name: "AmountIsZero";
      msg: "Amount is zero";
    },
    {
      code: 6042;
      name: "TypeCastFailed";
      msg: "Type cast error";
    },
    {
      code: 6043;
      name: "AmountIsNotEnough";
      msg: "Amount is not enough";
    },
    {
      code: 6044;
      name: "InvalidActivationDuration";
      msg: "Invalid activation duration";
    },
    {
      code: 6045;
      name: "PoolIsNotLaunchPool";
      msg: "Pool is not launch pool";
    },
    {
      code: 6046;
      name: "UnableToModifyActivationPoint";
      msg: "Unable to modify activation point";
    },
    {
      code: 6047;
      name: "InvalidAuthorityToCreateThePool";
      msg: "Invalid authority to create the pool";
    },
    {
      code: 6048;
      name: "InvalidActivationType";
      msg: "Invalid activation type";
    },
    {
      code: 6049;
      name: "InvalidActivationPoint";
      msg: "Invalid activation point";
    },
    {
      code: 6050;
      name: "PreActivationSwapStarted";
      msg: "Pre activation swap window started";
    },
    {
      code: 6051;
      name: "InvalidPoolType";
      msg: "Invalid pool type";
    },
    {
      code: 6052;
      name: "InvalidQuoteMint";
      msg: "Quote token must be SOL,USDC";
    },
    {
      code: 6053;
      name: "InvalidFeeCurve";
      msg: "Invalid fee curve";
    },
    {
      code: 6054;
      name: "InvalidPriceRange";
      msg: "Invalid Price Range";
    },
    {
      code: 6055;
      name: "PriceRangeViolation";
      msg: "Trade is over price range";
    },
    {
      code: 6056;
      name: "InvalidParameters";
      msg: "Invalid parameters";
    },
    {
      code: 6057;
      name: "InvalidCollectFeeMode";
      msg: "Invalid collect fee mode";
    },
    {
      code: 6058;
      name: "InvalidInput";
      msg: "Invalid input";
    },
    {
      code: 6059;
      name: "CannotCreateTokenBadgeOnSupportedMint";
      msg: "Cannot create token badge on supported mint";
    },
    {
      code: 6060;
      name: "InvalidTokenBadge";
      msg: "Invalid token badge";
    },
    {
      code: 6061;
      name: "InvalidMinimumLiquidity";
      msg: "Invalid minimum liquidity";
    },
    {
      code: 6062;
      name: "InvalidPositionOwner";
      msg: "Invalid position owner";
    },
    {
      code: 6063;
      name: "InvalidVestingInfo";
      msg: "Invalid vesting information";
    },
    {
      code: 6064;
      name: "InsufficientLiquidity";
      msg: "Insufficient liquidity";
    },
    {
      code: 6065;
      name: "InvalidVestingAccount";
      msg: "Invalid vesting account";
    },
    {
      code: 6066;
      name: "InvalidPoolStatus";
      msg: "Invalid pool status";
    },
    {
      code: 6067;
      name: "UnsupportNativeMintToken2022";
      msg: "Unsupported native mint token2022";
    },
    {
      code: 6068;
      name: "RewardMintIsNotSupport";
      msg: "Reward mint is not support";
    },
    {
      code: 6069;
      name: "InvalidRewardIndex";
      msg: "Invalid reward index";
    },
    {
      code: 6070;
      name: "InvalidRewardDuration";
      msg: "Invalid reward duration";
    },
    {
      code: 6071;
      name: "RewardInitialized";
      msg: "Reward already initialized";
    },
    {
      code: 6072;
      name: "RewardUninitialized";
      msg: "Reward not initialized";
    },
    {
      code: 6073;
      name: "InvalidRewardVault";
      msg: "Invalid reward vault";
    },
    {
      code: 6074;
      name: "MustWithdrawnIneligibleReward";
      msg: "Must withdraw ineligible reward";
    },
    {
      code: 6075;
      name: "WithdrawToWrongTokenAccount";
      msg: "Withdraw to wrong token account";
    },
    {
      code: 6076;
      name: "IdenticalRewardDuration";
      msg: "Reward duration is the same";
    },
    {
      code: 6077;
      name: "RewardCampaignInProgress";
      msg: "Reward campaign in progress";
    },
    {
      code: 6078;
      name: "IdenticalFunder";
      msg: "Identical funder";
    },
    {
      code: 6079;
      name: "InvalidFunder";
      msg: "Invalid funder";
    },
    {
      code: 6080;
      name: "RewardNotEnded";
      msg: "Reward not ended";
    },
    {
      code: 6081;
      name: "InvalidExtension";
      msg: "Invalid extension";
    }
  ];
};

export const IDL: CpAmm = {
  version: "0.1.0",
  name: "cp_amm",
  instructions: [
    {
      name: "createConfig",
      docs: ["ADMIN FUNCTIONS ////"],
      accounts: [
        {
          name: "config",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "configParameters",
          type: {
            defined: "ConfigParameters",
          },
        },
      ],
    },
    {
      name: "createTokenBadge",
      accounts: [
        {
          name: "tokenBadge",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "createClaimFeeOperator",
      accounts: [
        {
          name: "claimFeeOperator",
          isMut: true,
          isSigner: false,
        },
        {
          name: "operator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "closeClaimFeeOperator",
      accounts: [
        {
          name: "claimFeeOperator",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rentReceiver",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "closeConfig",
      accounts: [
        {
          name: "config",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "rentReceiver",
          isMut: true,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "initializeReward",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: true,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
        {
          name: "rewardDuration",
          type: "u64",
        },
        {
          name: "funder",
          type: "publicKey",
        },
      ],
    },
    {
      name: "fundReward",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "funderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "funder",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
        {
          name: "amount",
          type: "u64",
        },
        {
          name: "carryForward",
          type: "bool",
        },
      ],
    },
    {
      name: "withdrawIneligibleReward",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardVault",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "funderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "funder",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
      ],
    },
    {
      name: "updateRewardFunder",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
        {
          name: "newFunder",
          type: "publicKey",
        },
      ],
    },
    {
      name: "updateRewardDuration",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
        {
          name: "newDuration",
          type: "u64",
        },
      ],
    },
    {
      name: "setPoolStatus",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "admin",
          isMut: false,
          isSigner: true,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "status",
          type: "u8",
        },
      ],
    },
    {
      name: "claimProtocolFee",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "tokenAAccount",
          isMut: true,
          isSigner: false,
          docs: ["The treasury token a account"],
        },
        {
          name: "tokenBAccount",
          isMut: true,
          isSigner: false,
          docs: ["The treasury token b account"],
        },
        {
          name: "claimFeeOperator",
          isMut: false,
          isSigner: false,
          docs: ["Claim fee operator"],
        },
        {
          name: "operator",
          isMut: false,
          isSigner: true,
          docs: ["Operator"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "claimPartnerFee",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAAccount",
          isMut: true,
          isSigner: false,
          docs: ["The treasury token a account"],
        },
        {
          name: "tokenBAccount",
          isMut: true,
          isSigner: false,
          docs: ["The treasury token b account"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "partner",
          isMut: false,
          isSigner: true,
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "maxAmountA",
          type: "u64",
        },
        {
          name: "maxAmountB",
          type: "u64",
        },
      ],
    },
    {
      name: "initializePool",
      docs: ["USER FUNCTIONS ////"],
      accounts: [
        {
          name: "creator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "positionNftMint",
          isMut: true,
          isSigner: true,
          docs: ["Unique token mint address, initialize in contract"],
        },
        {
          name: "positionNftAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
          docs: ["Address paying to create the pool. Can be anyone"],
        },
        {
          name: "config",
          isMut: false,
          isSigner: false,
          docs: ["Which config the pool belongs to."],
        },
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
          docs: ["Initialize an account to store the pool state"],
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["Token a mint"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["Token b mint"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["Token a vault for the pool"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["Token b vault for the pool"],
        },
        {
          name: "payerTokenA",
          isMut: true,
          isSigner: false,
          docs: ["payer token a account"],
        },
        {
          name: "payerTokenB",
          isMut: true,
          isSigner: false,
          docs: ["creator token b account"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Program to create mint account and mint tokens"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Program to create mint account and mint tokens"],
        },
        {
          name: "token2022Program",
          isMut: false,
          isSigner: false,
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account",
          ],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "InitializePoolParameters",
          },
        },
      ],
    },
    {
      name: "initializeCustomizablePool",
      accounts: [
        {
          name: "creator",
          isMut: false,
          isSigner: false,
        },
        {
          name: "positionNftMint",
          isMut: true,
          isSigner: true,
          docs: ["Unique token mint address, initialize in contract"],
        },
        {
          name: "positionNftAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
          docs: ["Address paying to create the pool. Can be anyone"],
        },
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
          docs: ["Initialize an account to store the pool state"],
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["Token a mint"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["Token b mint"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["Token a vault for the pool"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["Token b vault for the pool"],
        },
        {
          name: "payerTokenA",
          isMut: true,
          isSigner: false,
          docs: ["payer token a account"],
        },
        {
          name: "payerTokenB",
          isMut: true,
          isSigner: false,
          docs: ["creator token b account"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Program to create mint account and mint tokens"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Program to create mint account and mint tokens"],
        },
        {
          name: "token2022Program",
          isMut: false,
          isSigner: false,
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account",
          ],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "InitializeCustomizablePoolParameters",
          },
        },
      ],
    },
    {
      name: "createPosition",
      accounts: [
        {
          name: "owner",
          isMut: false,
          isSigner: false,
        },
        {
          name: "positionNftMint",
          isMut: true,
          isSigner: true,
          docs: ["Unique token mint address, initialize in contract"],
        },
        {
          name: "positionNftAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
          docs: ["Address paying to create the position. Can be anyone"],
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
          docs: [
            "Program to create NFT mint/token account and transfer for token22 account",
          ],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "addLiquidity",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token a account"],
        },
        {
          name: "tokenBAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token b account"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "AddLiquidityParameters",
          },
        },
      ],
    },
    {
      name: "removeLiquidity",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token a account"],
        },
        {
          name: "tokenBAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token b account"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "RemoveLiquidityParameters",
          },
        },
      ],
    },
    {
      name: "swap",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
          docs: ["Pool account"],
        },
        {
          name: "inputTokenAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token account for input token"],
        },
        {
          name: "outputTokenAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token account for output token"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "payer",
          isMut: false,
          isSigner: true,
          docs: ["The user performing the swap"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "referralTokenAccount",
          isMut: true,
          isSigner: false,
          isOptional: true,
          docs: ["referral token account"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "SwapParameters",
          },
        },
      ],
    },
    {
      name: "claimPositionFee",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: false,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenAAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token a account"],
        },
        {
          name: "tokenBAccount",
          isMut: true,
          isSigner: false,
          docs: ["The user token b account"],
        },
        {
          name: "tokenAVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for input token"],
        },
        {
          name: "tokenBVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for output token"],
        },
        {
          name: "tokenAMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token a"],
        },
        {
          name: "tokenBMint",
          isMut: false,
          isSigner: false,
          docs: ["The mint of token b"],
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "tokenAProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token a program"],
        },
        {
          name: "tokenBProgram",
          isMut: false,
          isSigner: false,
          docs: ["Token b program"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "lockPosition",
      accounts: [
        {
          name: "pool",
          isMut: false,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "vesting",
          isMut: true,
          isSigner: true,
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "params",
          type: {
            defined: "VestingParameters",
          },
        },
      ],
    },
    {
      name: "refreshVesting",
      accounts: [
        {
          name: "pool",
          isMut: false,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "permanentLockPosition",
      accounts: [
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "permanentLockLiquidity",
          type: "u128",
        },
      ],
    },
    {
      name: "claimReward",
      accounts: [
        {
          name: "poolAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "pool",
          isMut: true,
          isSigner: false,
        },
        {
          name: "position",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rewardVault",
          isMut: true,
          isSigner: false,
          docs: ["The vault token account for reward token"],
        },
        {
          name: "rewardMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "userTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "positionNftAccount",
          isMut: false,
          isSigner: false,
          docs: ["The token account for nft"],
        },
        {
          name: "owner",
          isMut: false,
          isSigner: true,
          docs: ["owner of position"],
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "eventAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "program",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "rewardIndex",
          type: "u8",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "claimFeeOperator",
      docs: ["Parameter that set by the protocol"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "operator",
            docs: ["operator"],
            type: "publicKey",
          },
          {
            name: "padding",
            docs: ["Reserve"],
            type: {
              array: ["u8", 128],
            },
          },
        ],
      },
    },
    {
      name: "config",
      type: {
        kind: "struct",
        fields: [
          {
            name: "vaultConfigKey",
            docs: ["Vault config key"],
            type: "publicKey",
          },
          {
            name: "poolCreatorAuthority",
            docs: [
              "Only pool_creator_authority can use the current config to initialize new pool. When it's Pubkey::default, it's a public config.",
            ],
            type: "publicKey",
          },
          {
            name: "poolFees",
            docs: ["Pool fee"],
            type: {
              defined: "PoolFeesConfig",
            },
          },
          {
            name: "activationType",
            docs: ["Activation type"],
            type: "u8",
          },
          {
            name: "collectFeeMode",
            docs: ["Collect fee mode"],
            type: "u8",
          },
          {
            name: "padding0",
            docs: ["padding 0"],
            type: {
              array: ["u8", 6],
            },
          },
          {
            name: "index",
            docs: ["config index"],
            type: "u64",
          },
          {
            name: "sqrtMinPrice",
            docs: ["sqrt min price"],
            type: "u128",
          },
          {
            name: "sqrtMaxPrice",
            docs: ["sqrt max price"],
            type: "u128",
          },
          {
            name: "padding1",
            docs: ["Fee curve point", "Padding for further use"],
            type: {
              array: ["u64", 10],
            },
          },
        ],
      },
    },
    {
      name: "pool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poolFees",
            docs: ["Pool fee"],
            type: {
              defined: "PoolFeesStruct",
            },
          },
          {
            name: "tokenAMint",
            docs: ["token a mint"],
            type: "publicKey",
          },
          {
            name: "tokenBMint",
            docs: ["token b mint"],
            type: "publicKey",
          },
          {
            name: "tokenAVault",
            docs: ["token a vault"],
            type: "publicKey",
          },
          {
            name: "tokenBVault",
            docs: ["token b vault"],
            type: "publicKey",
          },
          {
            name: "whitelistedVault",
            docs: [
              "Whitelisted vault to be able to buy pool before activation_point",
            ],
            type: "publicKey",
          },
          {
            name: "partner",
            docs: ["partner"],
            type: "publicKey",
          },
          {
            name: "liquidity",
            docs: ["liquidity share"],
            type: "u128",
          },
          {
            name: "tokenAReserve",
            docs: ["token a reserve"],
            type: "u64",
          },
          {
            name: "tokenBReserve",
            docs: ["token b reserve"],
            type: "u64",
          },
          {
            name: "protocolAFee",
            docs: ["protocol a fee"],
            type: "u64",
          },
          {
            name: "protocolBFee",
            docs: ["protocol b fee"],
            type: "u64",
          },
          {
            name: "partnerAFee",
            docs: ["partner a fee"],
            type: "u64",
          },
          {
            name: "partnerBFee",
            docs: ["partner b fee"],
            type: "u64",
          },
          {
            name: "sqrtMinPrice",
            docs: ["min price"],
            type: "u128",
          },
          {
            name: "sqrtMaxPrice",
            docs: ["max price"],
            type: "u128",
          },
          {
            name: "sqrtPrice",
            docs: ["current price"],
            type: "u128",
          },
          {
            name: "activationPoint",
            docs: ["Activation point, can be slot or timestamp"],
            type: "u64",
          },
          {
            name: "activationType",
            docs: ["Activation type, 0 means by slot, 1 means by timestamp"],
            type: "u8",
          },
          {
            name: "poolStatus",
            docs: ["pool status, 0: enable, 1 disable"],
            type: "u8",
          },
          {
            name: "tokenAFlag",
            docs: ["token a flag"],
            type: "u8",
          },
          {
            name: "tokenBFlag",
            docs: ["token b flag"],
            type: "u8",
          },
          {
            name: "collectFeeMode",
            docs: [
              "0 is collect fee in both token, 1 only collect fee in token a, 2 only collect fee in token b",
            ],
            type: "u8",
          },
          {
            name: "poolType",
            docs: ["pool type"],
            type: "u8",
          },
          {
            name: "padding0",
            docs: ["padding"],
            type: {
              array: ["u8", 2],
            },
          },
          {
            name: "feeAPerLiquidity",
            docs: ["cumulative"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "feeBPerLiquidity",
            docs: ["cumulative"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "permanentLockLiquidity",
            type: "u128",
          },
          {
            name: "metrics",
            docs: ["metrics"],
            type: {
              defined: "PoolMetrics",
            },
          },
          {
            name: "rewardInfos",
            docs: ["Farming reward information"],
            type: {
              array: [
                {
                  defined: "RewardInfo",
                },
                2,
              ],
            },
          },
          {
            name: "padding1",
            docs: ["Padding for further use"],
            type: {
              array: ["u64", 10],
            },
          },
        ],
      },
    },
    {
      name: "position",
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "publicKey",
          },
          {
            name: "nftMint",
            docs: ["nft mint"],
            type: "publicKey",
          },
          {
            name: "feeAPerTokenCheckpoint",
            docs: ["fee a checkpoint"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "feeBPerTokenCheckpoint",
            docs: ["fee b checkpoint"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "feeAPending",
            docs: ["fee a pending"],
            type: "u64",
          },
          {
            name: "feeBPending",
            docs: ["fee b pending"],
            type: "u64",
          },
          {
            name: "unlockedLiquidity",
            docs: ["unlock liquidity"],
            type: "u128",
          },
          {
            name: "vestedLiquidity",
            docs: ["vesting liquidity"],
            type: "u128",
          },
          {
            name: "permanentLockedLiquidity",
            docs: ["permanent locked liquidity"],
            type: "u128",
          },
          {
            name: "metrics",
            docs: ["metrics"],
            type: {
              defined: "PositionMetrics",
            },
          },
          {
            name: "rewardInfos",
            docs: ["Farming reward information"],
            type: {
              array: [
                {
                  defined: "UserRewardInfo",
                },
                2,
              ],
            },
          },
          {
            name: "feeClaimer",
            docs: ["Fee claimer for this position"],
            type: "publicKey",
          },
          {
            name: "padding",
            docs: ["padding for future usage"],
            type: {
              array: ["u128", 4],
            },
          },
        ],
      },
    },
    {
      name: "tokenBadge",
      docs: ["Parameter that set by the protocol"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "tokenMint",
            docs: ["token mint"],
            type: "publicKey",
          },
          {
            name: "padding",
            docs: ["Reserve"],
            type: {
              array: ["u8", 128],
            },
          },
        ],
      },
    },
    {
      name: "vesting",
      type: {
        kind: "struct",
        fields: [
          {
            name: "position",
            type: "publicKey",
          },
          {
            name: "cliffPoint",
            type: "u64",
          },
          {
            name: "periodFrequency",
            type: "u64",
          },
          {
            name: "cliffUnlockLiquidity",
            type: "u128",
          },
          {
            name: "liquidityPerPeriod",
            type: "u128",
          },
          {
            name: "totalReleasedLiquidity",
            type: "u128",
          },
          {
            name: "numberOfPeriod",
            type: "u16",
          },
          {
            name: "padding",
            type: {
              array: ["u8", 14],
            },
          },
          {
            name: "padding2",
            type: {
              array: ["u128", 4],
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "ConfigParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poolFees",
            type: {
              defined: "PoolFeeParamters",
            },
          },
          {
            name: "sqrtMinPrice",
            type: "u128",
          },
          {
            name: "sqrtMaxPrice",
            type: "u128",
          },
          {
            name: "vaultConfigKey",
            type: "publicKey",
          },
          {
            name: "poolCreatorAuthority",
            type: "publicKey",
          },
          {
            name: "activationType",
            type: "u8",
          },
          {
            name: "collectFeeMode",
            type: "u8",
          },
          {
            name: "index",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "InitializeCustomizablePoolParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "poolFees",
            docs: ["pool fees"],
            type: {
              defined: "PoolFeeParamters",
            },
          },
          {
            name: "sqrtMinPrice",
            docs: ["sqrt min price"],
            type: "u128",
          },
          {
            name: "sqrtMaxPrice",
            docs: ["sqrt max price"],
            type: "u128",
          },
          {
            name: "hasAlphaVault",
            docs: ["has alpha vault"],
            type: "bool",
          },
          {
            name: "liquidity",
            docs: ["initialize liquidity"],
            type: "u128",
          },
          {
            name: "sqrtPrice",
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value",
            ],
            type: "u128",
          },
          {
            name: "activationType",
            docs: ["activation type"],
            type: "u8",
          },
          {
            name: "collectFeeMode",
            docs: ["collect fee mode"],
            type: "u8",
          },
          {
            name: "activationPoint",
            docs: ["activation point"],
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "InitializePoolParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidity",
            docs: ["initialize liquidity"],
            type: "u128",
          },
          {
            name: "sqrtPrice",
            docs: [
              "The init price of the pool as a sqrt(token_b/token_a) Q64.64 value",
            ],
            type: "u128",
          },
          {
            name: "activationPoint",
            docs: ["activation point"],
            type: {
              option: "u64",
            },
          },
        ],
      },
    },
    {
      name: "AddLiquidityParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "liquidityDelta",
            docs: ["delta liquidity"],
            type: "u128",
          },
          {
            name: "tokenAAmountThreshold",
            docs: ["maximum token a amount"],
            type: "u64",
          },
          {
            name: "tokenBAmountThreshold",
            docs: ["maximum token b amount"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "VestingParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliffPoint",
            type: {
              option: "u64",
            },
          },
          {
            name: "periodFrequency",
            type: "u64",
          },
          {
            name: "cliffUnlockLiquidity",
            type: "u128",
          },
          {
            name: "liquidityPerPeriod",
            type: "u128",
          },
          {
            name: "numberOfPeriod",
            type: "u16",
          },
          {
            name: "index",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "RemoveLiquidityParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "maxLiquidityDelta",
            docs: ["delta liquidity"],
            type: "u128",
          },
          {
            name: "tokenAAmountThreshold",
            docs: ["minimum token a amount"],
            type: "u64",
          },
          {
            name: "tokenBAmountThreshold",
            docs: ["minimum token b amount"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "SwapParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amountIn",
            type: "u64",
          },
          {
            name: "minimumAmountOut",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "PoolFeeParamters",
      docs: ["Information regarding fee charges"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "baseFee",
            docs: ["Base fee"],
            type: {
              defined: "BaseFeeParameters",
            },
          },
          {
            name: "protocolFeePercent",
            docs: ["Protocol trade fee percent"],
            type: "u8",
          },
          {
            name: "partnerFeePercent",
            docs: ["partner fee percent"],
            type: "u8",
          },
          {
            name: "referralFeePercent",
            docs: ["referral fee percent"],
            type: "u8",
          },
          {
            name: "dynamicFee",
            docs: ["dynamic fee"],
            type: {
              option: {
                defined: "DynamicFeeParameters",
              },
            },
          },
        ],
      },
    },
    {
      name: "BaseFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliffFeeNumerator",
            type: "u64",
          },
          {
            name: "numberOfPeriod",
            type: "u16",
          },
          {
            name: "periodFrequency",
            type: "u64",
          },
          {
            name: "reductionFactor",
            type: "u64",
          },
          {
            name: "feeSchedulerMode",
            type: "u8",
          },
        ],
      },
    },
    {
      name: "DynamicFeeParameters",
      type: {
        kind: "struct",
        fields: [
          {
            name: "binStep",
            type: "u16",
          },
          {
            name: "binStepU128",
            type: "u128",
          },
          {
            name: "filterPeriod",
            type: "u16",
          },
          {
            name: "decayPeriod",
            type: "u16",
          },
          {
            name: "reductionFactor",
            type: "u16",
          },
          {
            name: "maxVolatilityAccumulator",
            type: "u32",
          },
          {
            name: "variableFeeControl",
            type: "u32",
          },
        ],
      },
    },
    {
      name: "PartnerInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "feePercent",
            type: "u8",
          },
          {
            name: "partnerAuthority",
            type: "publicKey",
          },
          {
            name: "pendingFeeA",
            type: "u64",
          },
          {
            name: "pendingFeeB",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "PoolFeesConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "baseFee",
            type: {
              defined: "BaseFeeConfig",
            },
          },
          {
            name: "protocolFeePercent",
            type: "u8",
          },
          {
            name: "partnerFeePercent",
            type: "u8",
          },
          {
            name: "referralFeePercent",
            type: "u8",
          },
          {
            name: "padding0",
            type: {
              array: ["u8", 5],
            },
          },
          {
            name: "dynamicFee",
            docs: ["dynamic fee"],
            type: {
              defined: "DynamicFeeConfig",
            },
          },
          {
            name: "padding1",
            type: {
              array: ["u64", 2],
            },
          },
        ],
      },
    },
    {
      name: "BaseFeeConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliffFeeNumerator",
            type: "u64",
          },
          {
            name: "feeSchedulerMode",
            type: "u8",
          },
          {
            name: "padding",
            type: {
              array: ["u8", 5],
            },
          },
          {
            name: "numberOfPeriod",
            type: "u16",
          },
          {
            name: "periodFrequency",
            type: "u64",
          },
          {
            name: "reductionFactor",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "DynamicFeeConfig",
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            type: "u8",
          },
          {
            name: "padding",
            type: {
              array: ["u8", 7],
            },
          },
          {
            name: "maxVolatilityAccumulator",
            type: "u32",
          },
          {
            name: "variableFeeControl",
            type: "u32",
          },
          {
            name: "binStep",
            type: "u16",
          },
          {
            name: "filterPeriod",
            type: "u16",
          },
          {
            name: "decayPeriod",
            type: "u16",
          },
          {
            name: "reductionFactor",
            type: "u16",
          },
          {
            name: "binStepU128",
            type: "u128",
          },
        ],
      },
    },
    {
      name: "PoolFeesStruct",
      docs: [
        "Information regarding fee charges",
        "trading_fee = amount * trade_fee_numerator / denominator",
        "protocol_fee = trading_fee * protocol_fee_percentage / 100",
        "referral_fee = protocol_fee * referral_percentage / 100",
        "partner_fee = (protocol_fee - referral_fee) * partner_fee_percentage / denominator",
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "baseFee",
            docs: [
              "Trade fees are extra token amounts that are held inside the token",
              "accounts during a trade, making the value of liquidity tokens rise.",
              "Trade fee numerator",
            ],
            type: {
              defined: "BaseFeeStruct",
            },
          },
          {
            name: "protocolFeePercent",
            docs: [
              "Protocol trading fees are extra token amounts that are held inside the token",
              "accounts during a trade, with the equivalent in pool tokens minted to",
              "the protocol of the program.",
              "Protocol trade fee numerator",
            ],
            type: "u8",
          },
          {
            name: "partnerFeePercent",
            docs: ["partner fee"],
            type: "u8",
          },
          {
            name: "referralFeePercent",
            docs: ["referral fee"],
            type: "u8",
          },
          {
            name: "padding0",
            docs: ["padding"],
            type: {
              array: ["u8", 5],
            },
          },
          {
            name: "dynamicFee",
            docs: ["dynamic fee"],
            type: {
              defined: "DynamicFeeStruct",
            },
          },
          {
            name: "padding1",
            docs: ["padding"],
            type: {
              array: ["u64", 2],
            },
          },
        ],
      },
    },
    {
      name: "BaseFeeStruct",
      type: {
        kind: "struct",
        fields: [
          {
            name: "cliffFeeNumerator",
            type: "u64",
          },
          {
            name: "feeSchedulerMode",
            type: "u8",
          },
          {
            name: "padding0",
            type: {
              array: ["u8", 5],
            },
          },
          {
            name: "numberOfPeriod",
            type: "u16",
          },
          {
            name: "periodFrequency",
            type: "u64",
          },
          {
            name: "reductionFactor",
            type: "u64",
          },
          {
            name: "padding1",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "DynamicFeeStruct",
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            type: "u8",
          },
          {
            name: "padding",
            type: {
              array: ["u8", 7],
            },
          },
          {
            name: "maxVolatilityAccumulator",
            type: "u32",
          },
          {
            name: "variableFeeControl",
            type: "u32",
          },
          {
            name: "binStep",
            type: "u16",
          },
          {
            name: "filterPeriod",
            type: "u16",
          },
          {
            name: "decayPeriod",
            type: "u16",
          },
          {
            name: "reductionFactor",
            type: "u16",
          },
          {
            name: "lastUpdateTimestamp",
            type: "u64",
          },
          {
            name: "binStepU128",
            type: "u128",
          },
          {
            name: "sqrtPriceReference",
            type: "u128",
          },
          {
            name: "volatilityAccumulator",
            type: "u128",
          },
          {
            name: "volatilityReference",
            type: "u128",
          },
        ],
      },
    },
    {
      name: "PoolMetrics",
      type: {
        kind: "struct",
        fields: [
          {
            name: "totalLpAFee",
            type: "u128",
          },
          {
            name: "totalLpBFee",
            type: "u128",
          },
          {
            name: "totalProtocolAFee",
            type: "u64",
          },
          {
            name: "totalProtocolBFee",
            type: "u64",
          },
          {
            name: "totalPartnerAFee",
            type: "u64",
          },
          {
            name: "totalPartnerBFee",
            type: "u64",
          },
          {
            name: "totalPosition",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "RewardInfo",
      docs: ["Stores the state relevant for tracking liquidity mining rewards"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "initialized",
            docs: ["Indicates if the reward has been initialized"],
            type: "u8",
          },
          {
            name: "rewardTokenFlag",
            docs: ["reward token flag"],
            type: "u8",
          },
          {
            name: "padding0",
            docs: ["padding"],
            type: {
              array: ["u8", 6],
            },
          },
          {
            name: "mint",
            docs: ["Reward token mint."],
            type: "publicKey",
          },
          {
            name: "vault",
            docs: ["Reward vault token account."],
            type: "publicKey",
          },
          {
            name: "funder",
            docs: ["Authority account that allows to fund rewards"],
            type: "publicKey",
          },
          {
            name: "rewardDuration",
            docs: ["reward duration"],
            type: "u64",
          },
          {
            name: "rewardDurationEnd",
            docs: ["reward duration end"],
            type: "u64",
          },
          {
            name: "rewardRate",
            docs: ["reward rate"],
            type: "u128",
          },
          {
            name: "rewardPerTokenStored",
            docs: ["Reward per token stored"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "lastUpdateTime",
            docs: ["The last time reward states were updated."],
            type: "u64",
          },
          {
            name: "cumulativeSecondsWithEmptyLiquidityReward",
            docs: [
              "Accumulated seconds when the farm distributed rewards but the bin was empty.",
              "These rewards will be carried over to the next reward time window.",
            ],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "SwapResult",
      docs: ["Encodes all results of swapping"],
      type: {
        kind: "struct",
        fields: [
          {
            name: "outputAmount",
            type: "u64",
          },
          {
            name: "nextSqrtPrice",
            type: "u128",
          },
          {
            name: "lpFee",
            type: "u64",
          },
          {
            name: "protocolFee",
            type: "u64",
          },
          {
            name: "partnerFee",
            type: "u64",
          },
          {
            name: "referralFee",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "UserRewardInfo",
      type: {
        kind: "struct",
        fields: [
          {
            name: "rewardPerTokenCheckpoint",
            docs: ["The latest update reward checkpoint"],
            type: {
              array: ["u8", 32],
            },
          },
          {
            name: "rewardPendings",
            docs: ["Current pending rewards"],
            type: "u64",
          },
          {
            name: "totalClaimedRewards",
            docs: ["Total claimed rewards"],
            type: "u64",
          },
        ],
      },
    },
    {
      name: "PositionMetrics",
      type: {
        kind: "struct",
        fields: [
          {
            name: "totalClaimedAFee",
            type: "u64",
          },
          {
            name: "totalClaimedBFee",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "Rounding",
      docs: ["Round up, down"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Up",
          },
          {
            name: "Down",
          },
        ],
      },
    },
    {
      name: "TradeDirection",
      docs: ["Trade (swap) direction"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "AtoB",
          },
          {
            name: "BtoA",
          },
        ],
      },
    },
    {
      name: "ActivationType",
      docs: ["Type of the activation"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Slot",
          },
          {
            name: "Timestamp",
          },
        ],
      },
    },
    {
      name: "FeeSchedulerMode",
      docs: ["collect fee mode"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Linear",
          },
          {
            name: "Exponential",
          },
        ],
      },
    },
    {
      name: "CollectFeeMode",
      docs: ["collect fee mode"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "BothToken",
          },
          {
            name: "OnlyB",
          },
        ],
      },
    },
    {
      name: "PoolStatus",
      docs: ["collect fee mode"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Enable",
          },
          {
            name: "Disable",
          },
        ],
      },
    },
    {
      name: "PoolType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Permissionless",
          },
          {
            name: "Customizable",
          },
        ],
      },
    },
    {
      name: "ActivationType",
      docs: ["Type of the activation"],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Slot",
          },
          {
            name: "Timestamp",
          },
        ],
      },
    },
    {
      name: "TokenProgramFlags",
      type: {
        kind: "enum",
        variants: [
          {
            name: "TokenProgram",
          },
          {
            name: "TokenProgram2022",
          },
        ],
      },
    },
  ],
  events: [
    {
      name: "EvtCloseConfig",
      fields: [
        {
          name: "config",
          type: "publicKey",
          index: false,
        },
        {
          name: "admin",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtCreateConfig",
      fields: [
        {
          name: "poolFees",
          type: {
            defined: "PoolFeeParamters",
          },
          index: false,
        },
        {
          name: "vaultConfigKey",
          type: "publicKey",
          index: false,
        },
        {
          name: "poolCreatorAuthority",
          type: "publicKey",
          index: false,
        },
        {
          name: "activationType",
          type: "u8",
          index: false,
        },
        {
          name: "sqrtMinPrice",
          type: "u128",
          index: false,
        },
        {
          name: "sqrtMaxPrice",
          type: "u128",
          index: false,
        },
        {
          name: "collectFeeMode",
          type: "u8",
          index: false,
        },
        {
          name: "index",
          type: "u64",
          index: false,
        },
        {
          name: "config",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtCreateTokenBadge",
      fields: [
        {
          name: "tokenMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtCreateClaimFeeOperator",
      fields: [
        {
          name: "operator",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtCloseClaimFeeOperator",
      fields: [
        {
          name: "claimFeeOperator",
          type: "publicKey",
          index: false,
        },
        {
          name: "operator",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtInitializePool",
      fields: [
        {
          name: "tokenAMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "tokenBMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "creator",
          type: "publicKey",
          index: false,
        },
        {
          name: "payer",
          type: "publicKey",
          index: false,
        },
        {
          name: "alphaVault",
          type: "publicKey",
          index: false,
        },
        {
          name: "poolFees",
          type: {
            defined: "PoolFeeParamters",
          },
          index: false,
        },
        {
          name: "sqrtMinPrice",
          type: "u128",
          index: false,
        },
        {
          name: "sqrtMaxPrice",
          type: "u128",
          index: false,
        },
        {
          name: "activationType",
          type: "u8",
          index: false,
        },
        {
          name: "collectFeeMode",
          type: "u8",
          index: false,
        },
        {
          name: "liquidity",
          type: "u128",
          index: false,
        },
        {
          name: "sqrtPrice",
          type: "u128",
          index: false,
        },
        {
          name: "activationPoint",
          type: "u64",
          index: false,
        },
        {
          name: "tokenAFlag",
          type: "u8",
          index: false,
        },
        {
          name: "tokenBFlag",
          type: "u8",
          index: false,
        },
        {
          name: "totalAmountA",
          type: "u64",
          index: false,
        },
        {
          name: "totalAmountB",
          type: "u64",
          index: false,
        },
        {
          name: "poolType",
          type: "u8",
          index: false,
        },
      ],
    },
    {
      name: "EvtAddLiquidity",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "params",
          type: {
            defined: "AddLiquidityParameters",
          },
          index: false,
        },
        {
          name: "totalAmountA",
          type: "u64",
          index: false,
        },
        {
          name: "totalAmountB",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtClaimPositionFee",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "feeAClaimed",
          type: "u64",
          index: false,
        },
        {
          name: "feeBClaimed",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtCreatePosition",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "positionNftMint",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtRemoveLiquidity",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "params",
          type: {
            defined: "RemoveLiquidityParameters",
          },
          index: false,
        },
        {
          name: "amountA",
          type: "u64",
          index: false,
        },
        {
          name: "amountB",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtSwap",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "tradeDirection",
          type: "u8",
          index: false,
        },
        {
          name: "isReferral",
          type: "bool",
          index: false,
        },
        {
          name: "params",
          type: {
            defined: "SwapParameters",
          },
          index: false,
        },
        {
          name: "swapResult",
          type: {
            defined: "SwapResult",
          },
          index: false,
        },
        {
          name: "transferFeeExcludedAmountIn",
          type: "u64",
          index: false,
        },
        {
          name: "currentTimestamp",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtLockPosition",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "vesting",
          type: "publicKey",
          index: false,
        },
        {
          name: "cliffPoint",
          type: "u64",
          index: false,
        },
        {
          name: "periodFrequency",
          type: "u64",
          index: false,
        },
        {
          name: "cliffUnlockLiquidity",
          type: "u128",
          index: false,
        },
        {
          name: "liquidityPerPeriod",
          type: "u128",
          index: false,
        },
        {
          name: "numberOfPeriod",
          type: "u16",
          index: false,
        },
      ],
    },
    {
      name: "EvtPermanentLockPosition",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "liquidity",
          type: "u128",
          index: false,
        },
        {
          name: "poolNewPermanentLockedLiquidity",
          type: "u128",
          index: false,
        },
      ],
    },
    {
      name: "EvtClaimProtocolFee",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "tokenAAmount",
          type: "u64",
          index: false,
        },
        {
          name: "tokenBAmount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtClaimPartnerFee",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "tokenAAmount",
          type: "u64",
          index: false,
        },
        {
          name: "tokenBAmount",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtSetPoolStatus",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "status",
          type: "u8",
          index: false,
        },
      ],
    },
    {
      name: "EvtInitializeReward",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "funder",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardIndex",
          type: "u8",
          index: false,
        },
        {
          name: "rewardDuration",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtFundReward",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "funder",
          type: "publicKey",
          index: false,
        },
        {
          name: "mintReward",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardIndex",
          type: "u8",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
        {
          name: "transferFeeExcludedAmountIn",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtClaimReward",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "position",
          type: "publicKey",
          index: false,
        },
        {
          name: "owner",
          type: "publicKey",
          index: false,
        },
        {
          name: "mintReward",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardIndex",
          type: "u8",
          index: false,
        },
        {
          name: "totalReward",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtUpdateRewardDuration",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardIndex",
          type: "u8",
          index: false,
        },
        {
          name: "oldRewardDuration",
          type: "u64",
          index: false,
        },
        {
          name: "newRewardDuration",
          type: "u64",
          index: false,
        },
      ],
    },
    {
      name: "EvtUpdateRewardFunder",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardIndex",
          type: "u8",
          index: false,
        },
        {
          name: "oldFunder",
          type: "publicKey",
          index: false,
        },
        {
          name: "newFunder",
          type: "publicKey",
          index: false,
        },
      ],
    },
    {
      name: "EvtWithdrawIneligibleReward",
      fields: [
        {
          name: "pool",
          type: "publicKey",
          index: false,
        },
        {
          name: "rewardMint",
          type: "publicKey",
          index: false,
        },
        {
          name: "amount",
          type: "u64",
          index: false,
        },
      ],
    },
  ],
  errors: [
    {
      code: 6000,
      name: "MathOverflow",
      msg: "Math operation overflow",
    },
    {
      code: 6001,
      name: "InvalidFee",
      msg: "Invalid fee setup",
    },
    {
      code: 6002,
      name: "InvalidInvariant",
      msg: "Invalid invariant d",
    },
    {
      code: 6003,
      name: "FeeCalculationFailure",
      msg: "Fee calculation failure",
    },
    {
      code: 6004,
      name: "ExceededSlippage",
      msg: "Exceeded slippage tolerance",
    },
    {
      code: 6005,
      name: "InvalidCalculation",
      msg: "Invalid curve calculation",
    },
    {
      code: 6006,
      name: "ZeroTradingTokens",
      msg: "Given pool token amount results in zero trading tokens",
    },
    {
      code: 6007,
      name: "ConversionError",
      msg: "Math conversion overflow",
    },
    {
      code: 6008,
      name: "FaultyLpMint",
      msg: "LP mint authority must be 'A' vault lp, without freeze authority, and 0 supply",
    },
    {
      code: 6009,
      name: "MismatchedTokenMint",
      msg: "Token mint mismatched",
    },
    {
      code: 6010,
      name: "MismatchedLpMint",
      msg: "LP mint mismatched",
    },
    {
      code: 6011,
      name: "MismatchedOwner",
      msg: "Invalid lp token owner",
    },
    {
      code: 6012,
      name: "InvalidVaultAccount",
      msg: "Invalid vault account",
    },
    {
      code: 6013,
      name: "InvalidVaultLpAccount",
      msg: "Invalid vault lp account",
    },
    {
      code: 6014,
      name: "InvalidPoolLpMintAccount",
      msg: "Invalid pool lp mint account",
    },
    {
      code: 6015,
      name: "PoolDisabled",
      msg: "Pool disabled",
    },
    {
      code: 6016,
      name: "InvalidAdminAccount",
      msg: "Invalid admin account",
    },
    {
      code: 6017,
      name: "InvalidProtocolFeeAccount",
      msg: "Invalid protocol fee account",
    },
    {
      code: 6018,
      name: "SameAdminAccount",
      msg: "Same admin account",
    },
    {
      code: 6019,
      name: "IdenticalSourceDestination",
      msg: "Identical user source and destination token account",
    },
    {
      code: 6020,
      name: "ApyCalculationError",
      msg: "Apy calculation error",
    },
    {
      code: 6021,
      name: "InsufficientSnapshot",
      msg: "Insufficient virtual price snapshot",
    },
    {
      code: 6022,
      name: "NonUpdatableCurve",
      msg: "Current curve is non-updatable",
    },
    {
      code: 6023,
      name: "MisMatchedCurve",
      msg: "New curve is mismatched with old curve",
    },
    {
      code: 6024,
      name: "InvalidAmplification",
      msg: "Amplification is invalid",
    },
    {
      code: 6025,
      name: "UnsupportedOperation",
      msg: "Operation is not supported",
    },
    {
      code: 6026,
      name: "ExceedMaxAChanges",
      msg: "Exceed max amplification changes",
    },
    {
      code: 6027,
      name: "InvalidRemainingAccountsLen",
      msg: "Invalid remaining accounts length",
    },
    {
      code: 6028,
      name: "InvalidRemainingAccounts",
      msg: "Invalid remaining account",
    },
    {
      code: 6029,
      name: "MismatchedDepegMint",
      msg: "Token mint B doesn't matches depeg type token mint",
    },
    {
      code: 6030,
      name: "InvalidApyAccount",
      msg: "Invalid APY account",
    },
    {
      code: 6031,
      name: "InvalidTokenMultiplier",
      msg: "Invalid token multiplier",
    },
    {
      code: 6032,
      name: "InvalidDepegInformation",
      msg: "Invalid depeg information",
    },
    {
      code: 6033,
      name: "UpdateTimeConstraint",
      msg: "Update time constraint violated",
    },
    {
      code: 6034,
      name: "ExceedMaxFeeBps",
      msg: "Exceeded max fee bps",
    },
    {
      code: 6035,
      name: "InvalidAdmin",
      msg: "Invalid admin",
    },
    {
      code: 6036,
      name: "PoolIsNotPermissioned",
      msg: "Pool is not permissioned",
    },
    {
      code: 6037,
      name: "InvalidDepositAmount",
      msg: "Invalid deposit amount",
    },
    {
      code: 6038,
      name: "InvalidFeeOwner",
      msg: "Invalid fee owner",
    },
    {
      code: 6039,
      name: "NonDepletedPool",
      msg: "Pool is not depleted",
    },
    {
      code: 6040,
      name: "AmountNotPeg",
      msg: "Token amount is not 1:1",
    },
    {
      code: 6041,
      name: "AmountIsZero",
      msg: "Amount is zero",
    },
    {
      code: 6042,
      name: "TypeCastFailed",
      msg: "Type cast error",
    },
    {
      code: 6043,
      name: "AmountIsNotEnough",
      msg: "Amount is not enough",
    },
    {
      code: 6044,
      name: "InvalidActivationDuration",
      msg: "Invalid activation duration",
    },
    {
      code: 6045,
      name: "PoolIsNotLaunchPool",
      msg: "Pool is not launch pool",
    },
    {
      code: 6046,
      name: "UnableToModifyActivationPoint",
      msg: "Unable to modify activation point",
    },
    {
      code: 6047,
      name: "InvalidAuthorityToCreateThePool",
      msg: "Invalid authority to create the pool",
    },
    {
      code: 6048,
      name: "InvalidActivationType",
      msg: "Invalid activation type",
    },
    {
      code: 6049,
      name: "InvalidActivationPoint",
      msg: "Invalid activation point",
    },
    {
      code: 6050,
      name: "PreActivationSwapStarted",
      msg: "Pre activation swap window started",
    },
    {
      code: 6051,
      name: "InvalidPoolType",
      msg: "Invalid pool type",
    },
    {
      code: 6052,
      name: "InvalidQuoteMint",
      msg: "Quote token must be SOL,USDC",
    },
    {
      code: 6053,
      name: "InvalidFeeCurve",
      msg: "Invalid fee curve",
    },
    {
      code: 6054,
      name: "InvalidPriceRange",
      msg: "Invalid Price Range",
    },
    {
      code: 6055,
      name: "PriceRangeViolation",
      msg: "Trade is over price range",
    },
    {
      code: 6056,
      name: "InvalidParameters",
      msg: "Invalid parameters",
    },
    {
      code: 6057,
      name: "InvalidCollectFeeMode",
      msg: "Invalid collect fee mode",
    },
    {
      code: 6058,
      name: "InvalidInput",
      msg: "Invalid input",
    },
    {
      code: 6059,
      name: "CannotCreateTokenBadgeOnSupportedMint",
      msg: "Cannot create token badge on supported mint",
    },
    {
      code: 6060,
      name: "InvalidTokenBadge",
      msg: "Invalid token badge",
    },
    {
      code: 6061,
      name: "InvalidMinimumLiquidity",
      msg: "Invalid minimum liquidity",
    },
    {
      code: 6062,
      name: "InvalidPositionOwner",
      msg: "Invalid position owner",
    },
    {
      code: 6063,
      name: "InvalidVestingInfo",
      msg: "Invalid vesting information",
    },
    {
      code: 6064,
      name: "InsufficientLiquidity",
      msg: "Insufficient liquidity",
    },
    {
      code: 6065,
      name: "InvalidVestingAccount",
      msg: "Invalid vesting account",
    },
    {
      code: 6066,
      name: "InvalidPoolStatus",
      msg: "Invalid pool status",
    },
    {
      code: 6067,
      name: "UnsupportNativeMintToken2022",
      msg: "Unsupported native mint token2022",
    },
    {
      code: 6068,
      name: "RewardMintIsNotSupport",
      msg: "Reward mint is not support",
    },
    {
      code: 6069,
      name: "InvalidRewardIndex",
      msg: "Invalid reward index",
    },
    {
      code: 6070,
      name: "InvalidRewardDuration",
      msg: "Invalid reward duration",
    },
    {
      code: 6071,
      name: "RewardInitialized",
      msg: "Reward already initialized",
    },
    {
      code: 6072,
      name: "RewardUninitialized",
      msg: "Reward not initialized",
    },
    {
      code: 6073,
      name: "InvalidRewardVault",
      msg: "Invalid reward vault",
    },
    {
      code: 6074,
      name: "MustWithdrawnIneligibleReward",
      msg: "Must withdraw ineligible reward",
    },
    {
      code: 6075,
      name: "WithdrawToWrongTokenAccount",
      msg: "Withdraw to wrong token account",
    },
    {
      code: 6076,
      name: "IdenticalRewardDuration",
      msg: "Reward duration is the same",
    },
    {
      code: 6077,
      name: "RewardCampaignInProgress",
      msg: "Reward campaign in progress",
    },
    {
      code: 6078,
      name: "IdenticalFunder",
      msg: "Identical funder",
    },
    {
      code: 6079,
      name: "InvalidFunder",
      msg: "Invalid funder",
    },
    {
      code: 6080,
      name: "RewardNotEnded",
      msg: "Reward not ended",
    },
    {
      code: 6081,
      name: "InvalidExtension",
      msg: "Invalid extension",
    },
  ],
};
