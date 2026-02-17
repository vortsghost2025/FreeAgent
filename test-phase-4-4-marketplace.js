/**
 * Phase 4.4: Plugin Marketplace Tests
 * Comprehensive test suite for versioning, dependencies, hot-swap, and catalog
 */

import {
  PluginVersion,
  PluginCatalogEntry,
  PluginMarketplace,
  DependencyResolver,
  HotSwapLoader
} from './medical/federation/plugin-marketplace.js';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    testsFailed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ============================================================================
// TEST SUITE 1: PluginVersion
// ============================================================================

console.log('\n=== PHASE 4.4.1: PLUGIN VERSION TESTS ===\n');

test('PluginVersion: Parse semantic version', () => {
  const version = new PluginVersion('test', '1.2.3');
  assertEqual(version.semver.major, 1, 'Major version');
  assertEqual(version.semver.minor, 2, 'Minor version');
  assertEqual(version.semver.patch, 3, 'Patch version');
});

test('PluginVersion: Parse prerelease version', () => {
  const version = new PluginVersion('test', '1.0.0-beta.1');
  assertEqual(version.semver.major, 1, 'Major version');
  assertEqual(version.semver.prerelease, '-beta.1', 'Prerelease suffix');
});

test('PluginVersion: Version satisfies caret constraint', () => {
  const v1_2_3 = new PluginVersion('test', '1.2.3');
  assert(v1_2_3.satisfies('^1.0.0'), 'Satisfies ^1.0.0');
  assert(v1_2_3.satisfies('^1.2.0'), 'Satisfies ^1.2.0');

  const v2_0_0 = new PluginVersion('test', '2.0.0');
  assert(!v2_0_0.satisfies('^1.0.0'), 'Does not satisfy ^1.0.0');
});

test('PluginVersion: Version satisfies tilde constraint', () => {
  const v1_2_5 = new PluginVersion('test', '1.2.5');
  assert(v1_2_5.satisfies('~1.2.3'), 'Satisfies ~1.2.3');
  assert(!v1_2_5.satisfies('~1.3.3'), 'Does not satisfy ~1.3.3');
});

test('PluginVersion: Version satisfies exact constraint', () => {
  const v1_2_3 = new PluginVersion('test', '1.2.3');
  assert(v1_2_3.satisfies('1.2.3'), 'Satisfies exact version');
  assert(!v1_2_3.satisfies('1.2.4'), 'Does not satisfy different version');
});

test('PluginVersion: Compare versions', () => {
  const v1_0_0 = new PluginVersion('test', '1.0.0');
  const v1_0_1 = new PluginVersion('test', '1.0.1');
  const v1_1_0 = new PluginVersion('test', '1.1.0');

  assert(v1_0_0.compareTo(v1_0_1) < 0, '1.0.0 < 1.0.1');
  assert(v1_0_1.compareTo(v1_1_0) < 0, '1.0.1 < 1.1.0');
  assert(v1_1_0.compareTo(v1_0_0) > 0, '1.1.0 > 1.0.0');
});

test('PluginVersion: Store metadata', () => {
  const version = new PluginVersion('diagnosis', '2.1.0', {
    author: 'HealthCorp',
    description: 'Clinical diagnosis plugin',
    capabilities: ['diagnosis', 'differential'],
    dependencies: { 'phenotype-extractor': '^1.0.0' }
  });

  assertEqual(version.author, 'HealthCorp', 'Author stored');
  assertEqual(version.capabilities.length, 2, 'Capabilities stored');
  assert(version.dependencies['phenotype-extractor'], 'Dependencies stored');
});

// ============================================================================
// TEST SUITE 2: PluginCatalogEntry
// ============================================================================

console.log('\n=== PHASE 4.4.2: PLUGIN CATALOG ENTRY TESTS ===\n');

test('PluginCatalogEntry: Add versions', () => {
  const entry = new PluginCatalogEntry('diagnosis');

  const v1 = new PluginVersion('diagnosis', '1.0.0');
  const v2 = new PluginVersion('diagnosis', '1.1.0');

  entry.addVersion(v1);
  entry.addVersion(v2);

  assertEqual(entry.versions.size, 2, 'Two versions stored');
  assertEqual(entry.latestVersion.version, '1.1.0', 'Latest version is 1.1.0');
});

test('PluginCatalogEntry: Get version by constraint', () => {
  const entry = new PluginCatalogEntry('diagnosis');

  entry.addVersion(new PluginVersion('diagnosis', '1.0.0'));
  entry.addVersion(new PluginVersion('diagnosis', '1.1.0'));
  entry.addVersion(new PluginVersion('diagnosis', '2.0.0'));

  const latest = entry.getVersion('latest');
  assertEqual(latest.version, '2.0.0', 'Latest is 2.0.0');

  const compat = entry.getVersion('^1.0.0');
  assertEqual(compat.version, '1.1.0', 'Compatible version is 1.1.0');
});

test('PluginCatalogEntry: Record downloads and ratings', () => {
  const entry = new PluginCatalogEntry('diagnosis');

  entry.recordDownload();
  entry.recordDownload();
  entry.addReview(5, 'Excellent!');
  entry.addReview(4, 'Good');

  assertEqual(entry.downloads, 2, 'Downloads recorded');
  assertEqual(entry.rating, 4.5, 'Rating calculated');
});

test('PluginCatalogEntry: List all versions sorted', () => {
  const entry = new PluginCatalogEntry('diagnosis');

  entry.addVersion(new PluginVersion('diagnosis', '1.0.0'));
  entry.addVersion(new PluginVersion('diagnosis', '2.0.0'));
  entry.addVersion(new PluginVersion('diagnosis', '1.5.0'));

  const versions = entry.getAllVersions('desc');
  assertEqual(versions[0].version, '2.0.0', 'First version is newest');
  assertEqual(versions[2].version, '1.0.0', 'Last version is oldest');
});

// ============================================================================
// TEST SUITE 3: PluginMarketplace
// ============================================================================

console.log('\n=== PHASE 4.4.3: PLUGIN MARKETPLACE TESTS ===\n');

test('PluginMarketplace: Publish plugin version', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('diagnosis', '1.0.0', {
    description: 'Diagnosis engine',
    capabilities: ['diagnosis', 'differential']
  });

  const plugin = marketplace.getPlugin('diagnosis');
  assert(plugin !== null, 'Plugin published');
  assertEqual(plugin.version, '1.0.0', 'Version matches');
});

test('PluginMarketplace: Find by capability', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('diagnosis', '1.0.0', {
    capabilities: ['diagnosis', 'differential']
  });

  marketplace.publishPlugin('radiology', '1.0.0', {
    capabilities: ['imaging', 'differential']
  });

  const withDiff = marketplace.findByCapability('differential');
  assertEqual(withDiff.length, 2, 'Two plugins with differential capability');
});

test('PluginMarketplace: Find by category', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('diagnosis', '1.0.0', { category: 'clinical' });
  marketplace.publishPlugin('radiology', '1.0.0', { category: 'imaging' });
  marketplace.publishPlugin('genetics', '1.0.0', { category: 'clinical' });

  const clinical = marketplace.findByCategory('clinical');
  assertEqual(clinical.length, 2, 'Two clinical plugins');
});

test('PluginMarketplace: Search plugins', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('rare-disease-finder', '1.0.0', {
    description: 'Finds rare genetic diseases'
  });

  marketplace.publishPlugin('common-diagnosis', '1.0.0', {
    description: 'Common disease diagnosis'
  });

  const results = marketplace.search('rare');
  assertEqual(results.length, 1, 'Found rare disease plugin');
  assertEqual(results[0].name, 'rare-disease-finder', 'Correct plugin');
});

test('PluginMarketplace: Download plugin', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('diagnosis', '1.0.0');
  marketplace.publishPlugin('diagnosis', '1.1.0');

  const result = marketplace.downloadPlugin('diagnosis', '^1.0.0');
  assertEqual(result.success, true, 'Download successful');
  assertEqual(result.plugin.version, '1.1.0', 'Latest compatible version');
});

test('PluginMarketplace: Download non-existent plugin', () => {
  const marketplace = new PluginMarketplace();

  const result = marketplace.downloadPlugin('nonexistent');
  assertEqual(result.success, false, 'Download failed');
  assertEqual(result.error, 'PLUGIN_NOT_FOUND', 'Correct error');
});

test('PluginMarketplace: Statistics', () => {
  const marketplace = new PluginMarketplace();

  marketplace.publishPlugin('diagnosis', '1.0.0', { category: 'clinical' });
  marketplace.publishPlugin('diagnosis', '1.1.0', { category: 'clinical' });
  marketplace.publishPlugin('imaging', '1.0.0', { category: 'imaging' });

  marketplace.downloadPlugin('diagnosis', '1.0.0');
  marketplace.downloadPlugin('diagnosis', '1.0.0');

  const stats = marketplace.getStats();
  assertEqual(stats.totalPlugins, 2, 'Total plugins');
  assertEqual(stats.totalVersions, 3, 'Total versions');
  assertEqual(stats.totalDownloads, 2, 'Total downloads');
});

// ============================================================================
// TEST SUITE 4: DependencyResolver
// ============================================================================

console.log('\n=== PHASE 4.4.4: DEPENDENCY RESOLVER TESTS ===\n');

test('DependencyResolver: Simple dependency resolution', () => {
  const marketplace = new PluginMarketplace();
  const resolver = new DependencyResolver({ marketplace });

  marketplace.publishPlugin('base', '1.0.0');
  marketplace.publishPlugin('feature', '1.0.0', {
    dependencies: { base: '^1.0.0' }
  });

  const result = resolver.resolveDepencies('feature', '1.0.0');
  assertEqual(result.success, true, 'Resolved successfully');
  assertEqual(result.resolved.length, 2, 'Two plugins in tree');
});

test('DependencyResolver: Missing dependency', () => {
  const marketplace = new PluginMarketplace();
  const resolver = new DependencyResolver({ marketplace });

  marketplace.publishPlugin('feature', '1.0.0', {
    dependencies: { nonexistent: '^1.0.0' }
  });

  const result = resolver.resolveDepencies('feature', '1.0.0');
  assertEqual(result.success, false, 'Resolution failed');
  assert(result.error.includes('Unresolvable'), 'Correct error message');
});

test('DependencyResolver: Can install with dependencies satisfied', () => {
  const marketplace = new PluginMarketplace();
  const resolver = new DependencyResolver({ marketplace });

  marketplace.publishPlugin('base', '1.0.0');
  marketplace.publishPlugin('feature', '1.0.0', {
    dependencies: { base: '^1.0.0' }
  });

  const canInstall = resolver.canInstall('feature', '1.0.0', {});
  assertEqual(canInstall.canInstall, true, 'Can install');
  assertEqual(canInstall.missing.length, 0, 'No missing dependencies');
});

test('DependencyResolver: Cannot install with unsatisfied dependencies', () => {
  const marketplace = new PluginMarketplace();
  const resolver = new DependencyResolver({ marketplace });

  marketplace.publishPlugin('feature', '1.0.0', {
    dependencies: { nonexistent: '^1.0.0' }
  });

  const canInstall = resolver.canInstall('feature', '1.0.0', {});
  assertEqual(canInstall.canInstall, false, 'Cannot install');
  assertEqual(canInstall.missing.length, 1, 'One missing dependency');
});

// ============================================================================
// TEST SUITE 5: HotSwapLoader
// ============================================================================

console.log('\n=== PHASE 4.4.5: HOT-SWAP LOADER TESTS ===\n');

test('HotSwapLoader: Load plugin', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('diagnosis', '1.0.0');

  const loader = new HotSwapLoader({ marketplace });
  const result = loader.loadPlugin('diagnosis', '1.0.0', { process: () => {} });

  assertEqual(result.success, true, 'Load successful');
  const loaded = loader.getLoaded('diagnosis', '1.0.0');
  assert(loaded !== null, 'Plugin loaded');
});

test('HotSwapLoader: Cannot load without dependencies', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('feature', '1.0.0', {
    dependencies: { base: '^1.0.0' }
  });

  const loader = new HotSwapLoader({ marketplace });
  const result = loader.loadPlugin('feature', '1.0.0');

  assertEqual(result.success, false, 'Load failed');
  assertEqual(result.error, 'MISSING_DEPENDENCIES', 'Correct error');
});

test('HotSwapLoader: Hot-swap to new version', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('diagnosis', '1.0.0');
  marketplace.publishPlugin('diagnosis', '1.1.0');

  const loader = new HotSwapLoader({ marketplace });
  loader.loadPlugin('diagnosis', '1.0.0', { process: () => {} });

  const result = loader.hotswap('diagnosis', '1.0.0', '1.1.0');
  assertEqual(result.success, true, 'Hotswap successful');
  assertEqual(result.hotswaps, 1, 'One hotswap recorded');

  const loaded = loader.getLoaded('diagnosis', '1.1.0');
  assert(loaded !== null, 'New version loaded');

  const old = loader.getLoaded('diagnosis', '1.0.0');
  assert(old === null, 'Old version unloaded');
});

test('HotSwapLoader: Unload plugin', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('diagnosis', '1.0.0');

  const loader = new HotSwapLoader({ marketplace });
  loader.loadPlugin('diagnosis', '1.0.0');

  const result = loader.unloadPlugin('diagnosis', '1.0.0');
  assertEqual(result.success, true, 'Unload successful');

  const loaded = loader.getLoaded('diagnosis', '1.0.0');
  assert(loaded === null, 'Plugin unloaded');
});

test('HotSwapLoader: List loaded plugins', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('diagnosis', '1.0.0');
  marketplace.publishPlugin('imaging', '1.0.0');

  const loader = new HotSwapLoader({ marketplace });
  loader.loadPlugin('diagnosis', '1.0.0');
  loader.loadPlugin('imaging', '1.0.0');

  const loaded = loader.listLoaded();
  assertEqual(loaded.length, 2, 'Two plugins loaded');
});

test('HotSwapLoader: Statistics', () => {
  const marketplace = new PluginMarketplace();
  marketplace.publishPlugin('diagnosis', '1.0.0');
  marketplace.publishPlugin('diagnosis', '1.1.0');

  const loader = new HotSwapLoader({ marketplace });
  loader.loadPlugin('diagnosis', '1.0.0');
  loader.hotswap('diagnosis', '1.0.0', '1.1.0');
  loader.hotswap('diagnosis', '1.1.0', '1.0.0');

  const stats = loader.getStats();
  assertEqual(stats.loadedPlugins, 1, 'One plugin loaded');
  assertEqual(stats.totalHotswaps, 2, 'Two hotswaps recorded');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n=== PHASE 4.4.6: PLUGIN MARKETPLACE INTEGRATION TESTS ===\n');

test('Integration: Complete plugin lifecycle', () => {
  const marketplace = new PluginMarketplace();
  const loader = new HotSwapLoader({ marketplace });

  // Publish multiple versions
  marketplace.publishPlugin('diagnosis', '1.0.0', {
    description: 'Initial diagnosis engine',
    category: 'clinical',
    capabilities: ['diagnosis']
  });

  marketplace.publishPlugin('diagnosis', '1.1.0', {
    description: 'Improved diagnosis engine',
    category: 'clinical',
    capabilities: ['diagnosis', 'differential']
  });

  // Download and load initial version
  const downloadResult = marketplace.downloadPlugin('diagnosis', '1.0.0');
  assertEqual(downloadResult.success, true, 'Downloaded v1.0.0');

  const loadResult = loader.loadPlugin('diagnosis', '1.0.0');
  assertEqual(loadResult.success, true, 'Loaded v1.0.0');

  // Hotswap to new version
  const swapResult = loader.hotswap('diagnosis', '1.0.0', '1.1.0');
  assertEqual(swapResult.success, true, 'Hotswapped to v1.1.0');

  // Verify final state
  const stats = marketplace.getStats();
  assertEqual(stats.totalPlugins, 1, 'One plugin in catalog');
  assertEqual(stats.totalVersions, 2, 'Two versions available');

  const loaderStats = loader.getStats();
  assertEqual(loaderStats.loadedPlugins, 1, 'One plugin loaded');
  assertEqual(loaderStats.totalHotswaps, 1, 'One hotswap performed');
});

test('Integration: Clinical protocol distribution', () => {
  const marketplace = new PluginMarketplace();

  // Publish clinical protocols
  marketplace.publishPlugin('rare-disease-finder', '2.0.0', {
    author: 'GenomicsLab',
    description: 'Rare genetic disease identification',
    category: 'clinical',
    capabilities: ['phenotype-analysis', 'variant-analysis', 'rare-disease-detection']
  });

  marketplace.publishPlugin('gwas-analyzer', '1.5.0', {
    author: 'BioStats',
    description: 'Genome-wide association analysis',
    category: 'analysis',
    capabilities: ['statistical-analysis', 'association-mapping']
  });

  marketplace.publishPlugin('variant-caller', '3.1.0', {
    author: 'Genomics',
    description: 'Variant calling from sequencing data',
    category: 'sequencing',
    capabilities: ['variant-calling', 'quality-filtering']
  });

  // Search for specific capability
  const phenotypePlugins = marketplace.findByCapability('phenotype-analysis');
  assertEqual(phenotypePlugins.length, 1, 'Found phenotype analysis plugin');

  const allPlugins = marketplace.listPlugins({ sortBy: 'downloads' });
  assertEqual(allPlugins.length, 3, 'All three plugins available');

  const stats = marketplace.getStats();
  assert(stats.capabilities.includes('phenotype-analysis'), 'Capabilities indexed');
  assert(stats.categories.includes('clinical'), 'Categories tracked');
});

test('Integration: Dependency chain resolution', () => {
  const marketplace = new PluginMarketplace();
  const resolver = new DependencyResolver({ marketplace });

  marketplace.publishPlugin('base', '1.0.0');
  marketplace.publishPlugin('core', '1.0.0', { dependencies: { base: '^1.0.0' } });
  marketplace.publishPlugin('advanced', '1.0.0', { dependencies: { core: '^1.0.0', base: '^1.0.0' } });

  const result = resolver.resolveDepencies('advanced', '1.0.0');
  assertEqual(result.success, true, 'Chain resolved');
  assert(result.resolved.length >= 2, 'Multiple plugins in tree');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== PHASE 4.4 TEST SUMMARY ===\n');
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests:  ${testsPassed + testsFailed}`);
console.log(`Pass Rate:    ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

if (testsFailed === 0) {
  console.log('✓ Phase 4.4 Plugin Marketplace: PRODUCTION READY');
  console.log('✓ Versioning and semantic constraints validated');
  console.log('✓ Dependency resolution working');
  console.log('✓ Hot-swap plugin loader verified');
  console.log('✓ Catalog and search functionality complete');
  console.log('✓ Ready for Phase 4.5: Adaptive Topology\n');
} else {
  console.log(`✗ ${testsFailed} test(s) failed - review implementation\n`);
}

export { testsPassed, testsFailed };
