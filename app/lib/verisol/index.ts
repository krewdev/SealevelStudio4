// VeriSol Protocol Exports
export * from './config';
export * from './proof';
export * from './mint';
export * from './check';
export * from './beta-tester-proof';
export * from './beta-tester-check';
export * from './setup-guide';
export * from './commitment-proof'; // Hash-based commitment alternative to ZK (⚠️ requires trust)
export * from './transparent-commitment'; // Transparent commitments to reduce trust
export * from './hybrid-proof'; // Hybrid system supporting both ZK and commitments
export { IDL as VeriSolIDL } from './aletheia_protocol';
export type { AletheiaProtocol as VeriSolProgram } from './aletheia_protocol';

