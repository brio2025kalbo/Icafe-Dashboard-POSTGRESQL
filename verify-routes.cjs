#!/usr/bin/env node

/**
 * Verification script to check if all multi-user cafe assignment routes are properly defined
 * Run this to verify the feature has been correctly installed
 */

const fs = require('fs');
const path = require('path');

const routersPath = path.join(__dirname, 'server', 'routers.ts');

if (!fs.existsSync(routersPath)) {
  console.error('❌ Cannot find server/routers.ts');
  console.error('   Make sure you are running this from the project root directory');
  process.exit(1);
}

const routersContent = fs.readFileSync(routersPath, 'utf8');

const routes = [
  { path: 'cafes.list', type: 'protectedProcedure', desc: 'List user cafes' },
  { path: 'cafes.get', type: 'protectedProcedure', desc: 'Get cafe by ID' },
  { path: 'cafes.add', type: 'adminProcedure', desc: 'Add new cafe' },
  { path: 'cafes.update', type: 'adminProcedure', desc: 'Update cafe settings' },
  { path: 'cafes.delete', type: 'adminProcedure', desc: 'Delete cafe' },
  { path: 'cafes.testConnection', type: 'adminProcedure', desc: 'Test cafe API connection' },
  { path: 'cafes.testConnectionDirect', type: 'adminProcedure', desc: 'Test direct connection' },
  { path: 'cafes.getUsers', type: 'adminProcedure', desc: 'Get users assigned to cafe' },
  { path: 'cafes.assignUser', type: 'adminProcedure', desc: 'Assign user to cafe' },
  { path: 'cafes.removeUser', type: 'adminProcedure', desc: 'Remove user from cafe' },
  { path: 'users.list', type: 'adminProcedure', desc: 'List all users' }
];

console.log('🔍 Verifying Multi-User Cafe Assignment Routes\n');
console.log('=' .repeat(60));

let allFound = true;

routes.forEach(route => {
  const [router, method] = route.path.split('.');
  const regex = new RegExp(`${method}:\\s+${route.type}`);
  const found = regex.test(routersContent);
  const status = found ? '✅' : '❌';
  
  if (!found) allFound = false;
  
  console.log(`${status} ${route.path.padEnd(30)} ${route.desc}`);
});

console.log('=' .repeat(60));

// Check imports
console.log('\n🔍 Verifying Database Function Imports\n');
console.log('=' .repeat(60));

const requiredImports = [
  { name: 'assignUserToCafe', desc: 'Assign user to cafe function' },
  { name: 'removeUserFromCafe', desc: 'Remove user from cafe function' },
  { name: 'getCafeUsers', desc: 'Get cafe users function' },
  { name: 'getAllUsers', desc: 'Get all users function' }
];

requiredImports.forEach(imp => {
  const found = routersContent.includes(imp.name);
  const status = found ? '✅' : '❌';
  
  if (!found) allFound = false;
  
  console.log(`${status} ${imp.name.padEnd(30)} ${imp.desc}`);
});

console.log('=' .repeat(60));

// Check schema
console.log('\n🔍 Verifying Database Schema\n');
console.log('=' .repeat(60));

const schemaPath = path.join(__dirname, 'drizzle', 'schema.ts');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const hasUserCafesTable = schemaContent.includes('export const userCafes');
  
  console.log(`${hasUserCafesTable ? '✅' : '❌'} user_cafes junction table defined`);
  
  if (!hasUserCafesTable) allFound = false;
} else {
  console.log('❌ Cannot find drizzle/schema.ts');
  allFound = false;
}

console.log('=' .repeat(60));

if (allFound) {
  console.log('\n✅ All routes, imports, and schema are properly defined!\n');
  console.log('If you\'re seeing "No procedure found" errors:');
  console.log('  1. Stop the dev server (Ctrl+C)');
  console.log('  2. Clear cache: rm -rf node_modules/.vite dist');
  console.log('  3. Restart: npm run dev\n');
  console.log('See TROUBLESHOOTING.md for more help.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some routes or imports are missing!\n');
  console.log('Please ensure all code changes have been applied correctly.');
  console.log('See IMPLEMENTATION_SUMMARY.md for details.\n');
  process.exit(1);
}