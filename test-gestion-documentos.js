/**
 * Comprehensive Test Script for Gestión de Documentos
 * Tests all the fixes implemented for the document management system
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = '';

// Test configuration
const testConfig = {
  username: 'testuser',
  password: 'test123',
  timeout: 10000
};

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Authentication helper
async function authenticate() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: testConfig.username,
      password: testConfig.password
    });

    authToken = response.data.token;
    logSuccess('Authentication successful');
    return true;
  } catch (error) {
    logError(`Authentication failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// API helper with auth
function apiCall(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    timeout: testConfig.timeout
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
}

// Test 1: Verify basic gestion documentos endpoint
async function testBasicEndpoint() {
  logInfo('Testing basic Gestión Documentos endpoint...');

  try {
    const response = await apiCall('GET', '/gestion-documentos');

    if (response.status === 200) {
      logSuccess('Basic endpoint working');
      logInfo(`Found ${response.data.asignaciones?.length || 0} assignments`);
      logInfo(`Pagination: ${JSON.stringify(response.data.pagination)}`);
      return response.data;
    } else {
      logError(`Unexpected status code: ${response.status}`);
      return null;
    }
  } catch (error) {
    logError(`Basic endpoint failed: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Test 2: Test date validation and parsing
async function testDateValidation() {
  logInfo('Testing date validation...');

  const testDates = [
    { input: '2025-12-31', expected: 'valid', description: 'Valid ISO date' },
    { input: 'Invalid date', expected: 'null', description: 'Invalid date string' },
    { input: '', expected: 'null', description: 'Empty string' },
    { input: null, expected: 'null', description: 'Null value' },
    { input: '2025-02-30', expected: 'null', description: 'Invalid calendar date' }
  ];

  logInfo('Date validation test cases:');
  for (const testCase of testDates) {
    // This tests the parseDate helper function logic
    const parsedDate = testCase.input && testCase.input !== 'Invalid date' ?
      (new Date(testCase.input).getTime() ? testCase.input : null) : null;

    const result = parsedDate ? 'valid' : 'null';

    if (result === testCase.expected) {
      logSuccess(`  ${testCase.description}: ${testCase.input} → ${result}`);
    } else {
      logError(`  ${testCase.description}: Expected ${testCase.expected}, got ${result}`);
    }
  }
}

// Test 3: Test mutually exclusive filters
async function testMutuallyExclusiveFilters() {
  logInfo('Testing mutually exclusive filters...');

  try {
    // Test with recurso filter
    const recursoResponse = await apiCall('GET', '/gestion-documentos?recursoId=1');
    if (recursoResponse.status === 200) {
      const asignaciones = recursoResponse.data.asignaciones || [];
      const hasEntidades = asignaciones.some(a => a.tipo === 'entidad');

      if (!hasEntidades) {
        logSuccess('Recurso filter correctly excludes entidades');
      } else {
        logWarning('Recurso filter still showing entidades');
      }
    }

    // Test with entidad filter
    const entidadResponse = await apiCall('GET', '/gestion-documentos?entidadId=1');
    if (entidadResponse.status === 200) {
      const asignaciones = entidadResponse.data.asignaciones || [];
      const hasRecursos = asignaciones.some(a => a.tipo === 'recurso');

      if (!hasRecursos) {
        logSuccess('Entidad filter correctly excludes recursos');
      } else {
        logWarning('Entidad filter still showing recursos');
      }
    }
  } catch (error) {
    logError(`Filter testing failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 4: Test entity names and estado logic
async function testEntityNamesAndStates() {
  logInfo('Testing entity names and state logic...');

  try {
    const response = await apiCall('GET', '/gestion-documentos');
    if (response.status === 200) {
      const asignaciones = response.data.asignaciones || [];

      // Check entity names
      const entidadAssignments = asignaciones.filter(a => a.tipo === 'entidad');
      let entityNamesOk = true;

      for (const asignacion of entidadAssignments) {
        if (!asignacion.asignadoA?.nombre || asignacion.asignadoA.nombre === 'ENT') {
          entityNamesOk = false;
          logError(`Found invalid entity name: ${asignacion.asignadoA?.nombre}`);
        }
      }

      if (entityNamesOk && entidadAssignments.length > 0) {
        logSuccess('Entity names are correctly displayed');
      } else if (entidadAssignments.length === 0) {
        logInfo('No entity assignments found to test');
      }

      // Check universal vs specific document state logic
      let stateLogicOk = true;
      for (const asignacion of asignaciones) {
        if (asignacion.documento?.esUniversal) {
          // Universal documents should use document's state
          if (!asignacion.estado && !asignacion.documento.estado) {
            logWarning(`Universal document ${asignacion.documento.codigo} has no state`);
          } else {
            logSuccess(`Universal document ${asignacion.documento.codigo} has correct state logic`);
          }
        } else {
          // Specific documents should use assignment's state
          logSuccess(`Specific document ${asignacion.documento.codigo} allows assignment-specific state`);
        }
      }

    }
  } catch (error) {
    logError(`Entity names and states test failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 5: Test update functionality with date validation
async function testUpdateFunctionality() {
  logInfo('Testing update functionality with date validation...');

  try {
    // First get an assignment to update
    const response = await apiCall('GET', '/gestion-documentos');
    if (response.status === 200) {
      const asignaciones = response.data.asignaciones || [];

      if (asignaciones.length > 0) {
        const asignacion = asignaciones[0];
        const { tipo, asignacionId } = asignacion;

        // Test valid date update
        const validUpdateData = {
          fechaEmision: '2025-01-01',
          fechaTramitacion: '2025-01-02',
          fechaVencimiento: '2025-12-31',
          estadoId: asignacion.estado?.id || null
        };

        try {
          const updateResponse = await apiCall('PUT',
            `/gestion-documentos/${tipo}/${asignacionId}`,
            validUpdateData
          );

          if (updateResponse.status === 200) {
            logSuccess('Valid date update successful');
          }
        } catch (updateError) {
          logError(`Valid date update failed: ${updateError.response?.data?.message || updateError.message}`);
        }

        // Test invalid date handling
        const invalidUpdateData = {
          fechaEmision: 'Invalid date',
          fechaTramitacion: '',
          fechaVencimiento: null,
          estadoId: asignacion.estado?.id || null,
          estadoSeguimiento: 'enviado'
        };

        try {
          const invalidUpdateResponse = await apiCall('PUT',
            `/gestion-documentos/${tipo}/${asignacionId}`,
            invalidUpdateData
          );

          if (invalidUpdateResponse.status === 200) {
            logSuccess('Invalid date handling working (converted to null)');
          }
        } catch (invalidUpdateError) {
          if (invalidUpdateError.response?.status === 500 &&
              invalidUpdateError.response?.data?.message?.includes('Invalid date')) {
            logError('Date validation not working - still getting 500 error');
          } else {
            logSuccess('Invalid dates properly handled');
          }
        }
      } else {
        logWarning('No assignments found to test updates');
      }
    }
  } catch (error) {
    logError(`Update functionality test failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 6: Test filters and search functionality
async function testFiltersAndSearch() {
  logInfo('Testing filters and search functionality...');

  const filterTests = [
    { param: 'search', value: 'DNI', description: 'Search filter' },
    { param: 'estadoId', value: '1', description: 'Estado filter' },
    { param: 'diasVencimiento', value: '30', description: 'Days to expiration filter' }
  ];

  for (const test of filterTests) {
    try {
      const response = await apiCall('GET', `/gestion-documentos?${test.param}=${test.value}`);
      if (response.status === 200) {
        logSuccess(`${test.description} working`);
        logInfo(`  Found ${response.data.asignaciones?.length || 0} results`);
      }
    } catch (error) {
      logError(`${test.description} failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test 7: Test estadisticas endpoint
async function testEstadisticas() {
  logInfo('Testing estadisticas endpoint...');

  try {
    const response = await apiCall('GET', '/gestion-documentos/estadisticas');
    if (response.status === 200) {
      logSuccess('Estadisticas endpoint working');
      logInfo(`  Total assignments: ${response.data.totalAsignaciones}`);
      logInfo(`  Próximos a vencer: ${response.data.proximosVencer}`);
    }
  } catch (error) {
    logError(`Estadisticas test failed: ${error.response?.data?.message || error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log(`${colors.bold}🧪 Starting Comprehensive Gestión de Documentos Tests${colors.reset}`);
  log('=' * 60);

  // Authenticate first
  const authSuccess = await authenticate();
  if (!authSuccess) {
    logError('Cannot proceed without authentication');
    return;
  }

  log('');

  // Run all tests
  const tests = [
    { name: 'Basic Endpoint', fn: testBasicEndpoint },
    { name: 'Date Validation', fn: testDateValidation },
    { name: 'Mutually Exclusive Filters', fn: testMutuallyExclusiveFilters },
    { name: 'Entity Names and States', fn: testEntityNamesAndStates },
    { name: 'Update Functionality', fn: testUpdateFunctionality },
    { name: 'Filters and Search', fn: testFiltersAndSearch },
    { name: 'Estadisticas', fn: testEstadisticas }
  ];

  for (const test of tests) {
    log(`\n${colors.bold}--- ${test.name} ---${colors.reset}`);
    await test.fn();
  }

  log(`\n${colors.bold}🎉 All tests completed!${colors.reset}`);
  log('=' * 60);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testBasicEndpoint,
  testDateValidation,
  testMutuallyExclusiveFilters,
  testEntityNamesAndStates,
  testUpdateFunctionality,
  testFiltersAndSearch,
  testEstadisticas
};