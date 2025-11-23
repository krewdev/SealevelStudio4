import { Connection, ParsedInstruction, PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { BuiltInstruction } from './instructions/types';
import { getTemplateById } from './instructions/templates';

// Helper to type check
function isParsedInstruction(ix: ParsedInstruction | PartiallyDecodedInstruction): ix is ParsedInstruction {
  return (ix as ParsedInstruction).parsed !== undefined;
}

export async function importTransaction(
  connection: Connection,
  signature: string
): Promise<BuiltInstruction[]> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || !tx.transaction) throw new Error('Transaction not found');

  const instructions: BuiltInstruction[] = [];
  const innerInstructions = tx.transaction.message.instructions;

  for (const ix of innerInstructions) {
    let builtIx: BuiltInstruction | null = null;

    if (isParsedInstruction(ix)) {
      // Handle Parsed Instructions
      const program = ix.program;
      const type = ix.parsed.type;
      const info = ix.parsed.info;

      if (program === 'system') {
        if (type === 'transfer') {
          const template = getTemplateById('system_transfer');
          if (template) {
             builtIx = {
               template,
               accounts: {
                 from: info.source,
                 to: info.destination
               },
               args: {
                 amount: info.lamports
               }
             };
          }
        } else if (type === 'createAccount') {
          const template = getTemplateById('system_create_account');
          if (template) {
            builtIx = {
              template,
              accounts: {
                from: info.source,
                newAccount: info.newAccount
              },
              args: {
                space: info.space
              }
            };
          }
        }
      } else if (program === 'spl-token') {
         if (type === 'transfer') {
            const template = getTemplateById('spl_token_transfer');
            if (template) {
              builtIx = {
                template,
                accounts: {
                  source: info.source,
                  destination: info.destination,
                  authority: info.authority
                },
                args: { amount: info.amount }
              };
            }
         } else if (type === 'mintTo') {
            const template = getTemplateById('spl_token_mint_to');
            if (template) {
              builtIx = {
                template,
                accounts: {
                  mint: info.mint,
                  destination: info.account, // 'account' in parsed info matches destination
                  authority: info.mintAuthority
                },
                args: { amount: info.amount }
              };
            }
         } else if (type === 'burn') {
            const template = getTemplateById('spl_token_burn');
            if (template) {
              builtIx = {
                template,
                accounts: {
                  source: info.account,
                  mint: info.mint,
                  authority: info.authority
                },
                args: { amount: info.amount }
              };
            }
         }
      } else if (program === 'spl-associated-token-account') {
          if (type === 'create') {
              const template = getTemplateById('spl_ata_create');
              if (template) {
                  builtIx = {
                      template,
                      accounts: {
                          funding: info.source,
                          associatedToken: info.account,
                          wallet: info.wallet,
                          mint: info.mint
                      },
                      args: {}
                  };
              }
          }
      }
    }

    // Fallback for unparsed or unmapped instructions
    if (!builtIx) {
      // We map to a custom instruction
      const baseTemplate = getTemplateById('custom_instruction');
      
      if (baseTemplate) {
        const accounts: Record<string, string> = {};
        const dynamicAccounts: Array<{ name: string; type: 'signer' | 'writable' | 'readonly'; description: string }> = [];
        
        if (!isParsedInstruction(ix)) {
           // Compiled instruction - match accounts with transaction account keys for metadata
           const accountKeys = tx.transaction.message.accountKeys;
           ix.accounts.forEach((acc, i) => {
             const name = `Account ${i + 1}`;
             accounts[name] = acc.toBase58();
             // Find matching account key to get signer/writable info
             const accountKey = accountKeys.find(ak => ak.pubkey.equals(acc));
             const type = accountKey 
               ? (accountKey.signer ? 'signer' : (accountKey.writable ? 'writable' : 'readonly'))
               : 'readonly';
             dynamicAccounts.push({
               name,
               type,
               description: `Imported Account ${i+1}`
             });
           });
        }

        builtIx = {
          template: {
             ...baseTemplate,
             programId: ix.programId.toBase58(),
             name: `Imported ${isParsedInstruction(ix) ? ix.program : 'Instruction'}`,
             description: `Imported from signature ${signature.slice(0, 8)}...`,
             accounts: dynamicAccounts.length > 0 ? dynamicAccounts : baseTemplate.accounts,
             // We add a custom arg for data if it's raw
             args: !isParsedInstruction(ix) ? [
                 { name: 'data', type: 'string', description: 'Base58 encoded data' }
             ] : baseTemplate.args
          },
          accounts,
          args: {
             data: !isParsedInstruction(ix) ? ix.data : JSON.stringify((ix as ParsedInstruction).parsed)
          }
        };
      }
    }

    if (builtIx) instructions.push(builtIx);
  }

  return instructions;
}

