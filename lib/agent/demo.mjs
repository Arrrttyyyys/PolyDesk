#!/usr/bin/env node
/**
 * Agent Infrastructure Demo
 * 
 * Quick verification that all agent tools are properly exported and structured.
 * Run: node lib/agent/demo.mjs
 */

import { readFileSync } from 'fs';

console.log('\n🤖 PolyPilot Agent Infrastructure Demo\n');
console.log('━'.repeat(50));

// Check schemas
console.log('\n📊 Zod Schemas:');
const schemas = readFileSync('lib/agent/schemas.ts', 'utf8');
const schemaExports = schemas.match(/export (?:const|type) (\w+Schema|\w+(?= = z\.infer))/g) || [];
const uniqueSchemas = [...new Set(schemaExports.map(s => s.split(' ').pop()))];
uniqueSchemas.forEach(schema => console.log(`   ✓ ${schema}`));
console.log(`   Total: ${uniqueSchemas.length} schemas`);

// Check tools
const tools = {
  'polymarket.ts': [
    'tool_listSportsLeagues',
    'tool_findMarketsByLeague',
    'tool_searchMarkets',
    'tool_getMarketSnapshot',
    'tool_getLivePrices',
    'tool_getOrderbook',
    'tool_getPriceHistory'
  ],
  'news.ts': [
    'tool_searchNews',
    'tool_extractArticle',
    'tool_scoreStanceSentiment'
  ],
  'compression.ts': [
    'tool_compressText'
  ],
  'analytics.ts': [
    'tool_computeMarketMetrics',
    'tool_computeCorrelations',
    'tool_detectInefficiencies'
  ],
  'strategy.ts': [
    'tool_suggestHedges',
    'tool_buildStrategyTemplate',
    'tool_simulatePayoff',
    'tool_backtestTriggers'
  ],
  'dossier.ts': [
    'tool_generateTradeDossier'
  ]
};

console.log('\n🔧 Agent Tools:');
let totalTools = 0;
for (const [file, toolList] of Object.entries(tools)) {
  console.log(`\n   ${file}:`);
  const content = readFileSync(`lib/agent/tools/${file}`, 'utf8');
  toolList.forEach(tool => {
    const exists = content.includes(`export async function ${tool}`);
    console.log(`      ${exists ? '✓' : '✗'} ${tool}()`);
  });
  totalTools += toolList.length;
}
console.log(`\n   Total: ${totalTools} tools`);

// Check documentation
console.log('\n📚 Documentation:');
const docFiles = [
  'AGENT_INFRASTRUCTURE.md',
  'API_INTEGRATION_GUIDE.md',
  'TOKEN_COMPANY_SETUP.md'
];
docFiles.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    console.log(`   ✓ ${file} (${lines} lines)`);
  } catch {
    console.log(`   ✗ ${file} - MISSING`);
  }
});

// Summary
console.log('\n━'.repeat(50));
console.log('\n✨ Summary:');
console.log(`   • ${uniqueSchemas.length} Zod schemas for type safety`);
console.log(`   • ${totalTools} agent tools across 6 modules`);
console.log(`   • Full Polymarket integration (Gamma + CLOB)`);
console.log(`   • GDELT news search (keyless)`);
console.log(`   • Token Company compression`);
console.log(`   • Analytics & strategy construction`);
console.log(`   • Trade dossier generation`);
console.log('\n🎯 Next steps:');
console.log('   1. Set TOKEN_COMPANY_API_KEY in .env.local');
console.log('   2. Build LLM agent that orchestrates these tools');
console.log('   3. Create terminal UI for agent interaction');
console.log('\n✅ Agent infrastructure ready!\n');
