// Content Matching Test Script
// Run this in the browser console on your presentation generator platform

const API_BASE = window.location.origin; // Adjust if needed
const token = localStorage.getItem('token') || 'admin-token';

// Test cases for content matching
const testCases = {
  // High Success Rate Tests
  highSuccess: [
    {
      name: "Banking AI Automation",
      data: {
        useCase: "AI-powered customer service automation for banking",
        customer: "Regional Bank",
        industry: "Banking",
        targetAudience: "C-level executives",
        presentationLength: "medium",
        style: "professional",
        requirements: "Focus on ROI and implementation timeline"
      }
    },
    {
      name: "Tech Digital Transformation",
      data: {
        useCase: "digital transformation strategy implementation",
        customer: "Tech Solutions Inc",
        industry: "Technology",
        targetAudience: "IT managers",
        presentationLength: "long",
        style: "modern",
        requirements: "Include technical architecture and migration plan"
      }
    },
    {
      name: "Marketing Customer Acquisition",
      data: {
        useCase: "customer acquisition and retention strategies",
        customer: "Marketing Agency",
        industry: "Marketing",
        targetAudience: "marketing directors",
        presentationLength: "short",
        style: "creative",
        requirements: "Focus on social media and digital marketing"
      }
    }
  ],

  // Medium Success Rate Tests
  mediumSuccess: [
    {
      name: "Healthcare Data Management",
      data: {
        useCase: "patient data management and privacy compliance",
        customer: "Regional Hospital",
        industry: "Healthcare",
        targetAudience: "healthcare administrators",
        presentationLength: "medium",
        style: "professional",
        requirements: "HIPAA compliance and data security focus"
      }
    },
    {
      name: "Manufacturing Supply Chain",
      data: {
        useCase: "supply chain optimization and inventory management",
        customer: "Manufacturing Co",
        industry: "Manufacturing",
        targetAudience: "operations managers",
        presentationLength: "long",
        style: "corporate",
        requirements: "Include cost reduction and efficiency metrics"
      }
    }
  ],

  // Low Success Rate Tests
  lowSuccess: [
    {
      name: "Quantum Computing (Too Niche)",
      data: {
        useCase: "quantum computing applications in cryptography",
        customer: "Quantum Tech Labs",
        industry: "Quantum Computing",
        targetAudience: "quantum physicists",
        presentationLength: "medium",
        style: "technical",
        requirements: "Advanced mathematical concepts and algorithms"
      }
    },
    {
      name: "Metaverse Integration (Too New)",
      data: {
        useCase: "metaverse integration for retail experiences",
        customer: "Virtual Retail Corp",
        industry: "Metaverse",
        targetAudience: "VR developers",
        presentationLength: "short",
        style: "modern",
        requirements: "3D environments and virtual commerce"
      }
    },
    {
      name: "Actuarial Science (Too Specialized)",
      data: {
        useCase: "actuarial modeling for life insurance risk assessment",
        customer: "Life Insurance Co",
        industry: "Actuarial Science",
        targetAudience: "actuaries",
        presentationLength: "long",
        style: "technical",
        requirements: "Statistical models and mortality tables"
      }
    }
  ]
};

// Function to test a single case
async function testCase(testName, testData) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('📋 Input:', testData);
  
  try {
    const response = await fetch(`${API_BASE}/api/presentations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);
      return { success: true, result };
    } else {
      const error = await response.json();
      console.log('❌ Failed:', error);
      return { success: false, error };
    }
  } catch (err) {
    console.log('💥 Error:', err);
    return { success: false, error: err.message };
  }
}

// Function to run all tests
async function runAllTests() {
  console.log('🚀 Starting Content Matching Tests...\n');
  
  const results = {
    highSuccess: [],
    mediumSuccess: [],
    lowSuccess: []
  };

  // Test high success cases
  console.log('📈 Testing High Success Rate Cases:');
  for (const test of testCases.highSuccess) {
    const result = await testCase(test.name, test.data);
    results.highSuccess.push({ name: test.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between tests
  }

  // Test medium success cases
  console.log('\n📊 Testing Medium Success Rate Cases:');
  for (const test of testCases.mediumSuccess) {
    const result = await testCase(test.name, test.data);
    results.mediumSuccess.push({ name: test.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test low success cases
  console.log('\n📉 Testing Low Success Rate Cases:');
  for (const test of testCases.lowSuccess) {
    const result = await testCase(test.name, test.data);
    results.lowSuccess.push({ name: test.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n📋 Test Results Summary:');
  console.log('High Success Cases:', results.highSuccess.filter(r => r.success).length, '/', results.highSuccess.length);
  console.log('Medium Success Cases:', results.mediumSuccess.filter(r => r.success).length, '/', results.mediumSuccess.length);
  console.log('Low Success Cases:', results.lowSuccess.filter(r => r.success).length, '/', results.lowSuccess.length);

  return results;
}

// Function to test specific case
async function testSpecificCase(category, index) {
  const test = testCases[category][index];
  if (!test) {
    console.log('❌ Test case not found');
    return;
  }
  
  return await testCase(test.name, test.data);
}

// Export functions for manual testing
window.testContentMatching = {
  runAllTests,
  testSpecificCase,
  testCases,
  testCase
};

console.log('🧪 Content Matching Test Script Loaded!');
console.log('Usage:');
console.log('- testContentMatching.runAllTests() - Run all tests');
console.log('- testContentMatching.testSpecificCase("highSuccess", 0) - Test specific case');
console.log('- testContentMatching.testCase("Custom Test", { useCase: "...", ... }) - Test custom case');
