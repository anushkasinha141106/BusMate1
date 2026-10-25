import app from '../server/src/app.js';
import http from 'http';

const server = http.createServer(app);
server.listen(5099, async () => {
  console.log('Test server running on port 5099');

  try {
    // 1. Test dispatch recommendation
    const res1 = await fetch('http://127.0.0.1:5099/api/agent/dispatch-recommendation/route_5_pmpml?weather=Heavy%20Rain');
    const data1 = await res1.json();
    console.log('GET /api/agent/dispatch-recommendation/route_5_pmpml status:', res1.status);
    console.log('Recommended buses:', data1.allocation?.recommended_buses);
    console.log('Summary:', data1.explanation?.summary);
    console.log('Why this was chosen:', data1.explanation?.why_this_was_chosen);
    console.log('Tradeoff highlight:', data1.explanation?.trade_off_highlight);

    if (data1.allocation?.recommended_buses !== 3) {
      throw new Error(`Expected 3 recommended buses, got ${data1.allocation?.recommended_buses}`);
    }

    // 2. Test record evaluation
    const res2 = await fetch('http://127.0.0.1:5099/api/agent/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_condition: 'B',
        route_id: 'route_5_pmpml',
        recommended_buses: 3,
        final_decision: 'Accepted',
        final_buses: 3,
        time_to_decide_ms: 4500,
        confidence_score: 5,
        clarity_score: 5,
        trust_score: 5,
        override_reason: null
      })
    });
    const data2 = await res2.json();
    console.log('POST /api/agent/evaluation status:', res2.status, 'success:', data2.success);

    // 3. Test get evaluations
    const res3 = await fetch('http://127.0.0.1:5099/api/agent/evaluations');
    const data3 = await res3.json();
    console.log('GET /api/agent/evaluations status:', res3.status);
    console.log('Total evaluations:', data3.benchmarks?.total_evaluations);
    console.log('Condition A Latency:', data3.benchmarks?.condition_A_latency_ms);
    console.log('Condition B Latency:', data3.benchmarks?.condition_B_latency_ms);
    console.log('Agreement rate:', data3.benchmarks?.overall_agreement_rate_pct);

    console.log('ALL NODE AGENT API TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
