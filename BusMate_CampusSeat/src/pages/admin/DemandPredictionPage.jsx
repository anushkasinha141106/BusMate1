import React, { useState } from 'react';
import { predictDemand, getModelMetrics } from '../../services/predictionService';
import { SimulationNotice } from '../../components/common/SimulationNotice';
import { RiskBadge } from '../../components/common/RiskBadge';
import { LineChart as LineChartIcon, Calendar, Clock, BarChart2, ShieldAlert, Info, AlertTriangle, Layers } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import featureImportance from '../../data/feature_importance.json';

export const DemandPredictionPage = () => {
  const [route, setRoute] = useState('TALEGAON');
  const [dayOfWeek, setDayOfWeek] = useState('Friday');
  const [timeSlot, setTimeSlot] = useState('18:15');

  const prediction = predictDemand({
    busCapacity: 52,
    route,
    dayOfWeek,
    timeSlot
  });

  const metrics = getModelMetrics();

  const remainingSeats = Math.max(0, prediction.busCapacity - prediction.predictedDemand);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-6 h-6 text-sky-800" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ML Passenger Demand Prediction</h1>
          </div>
          <p className="text-sm font-bold text-slate-600 mt-1">
            Forecasts corridor passenger load using Random Forest regression trained on 7,650 real-world Kaggle transit time-series records (Dataset 2).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-xs font-black uppercase">
            Model Estimate (RF R²=0.932)
          </span>
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase">
            Capacity: 52 Seats
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Input Predictor Controls */}
        <div className="lg:col-span-5 bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-lg font-black text-slate-900">
              Corridor & Time Selectors
            </h2>
            <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Metropolitan Corridors</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Route / Corridor</label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-800"
              >
                <option value="LINE_HINJ_STN">Hinjawadi IT Park ➔ Pune Central (310 IT Express)</option>
                <option value="LINE_SWAR_STN">Swargate ➔ Pune Central Station (101 Direct)</option>
                <option value="LINE_KATR_SHIV">Katraj ➔ Shivajinagar Metro (204 Express)</option>
                <option value="LINE_HAD_KOTH">Hadapsar Gadital ➔ Kothrud Depot (412 Cross-Town)</option>
                <option value="LINE_VIM_SWAR">Pune Airport ➔ Swargate Terminal (505 Airport Flyer)</option>
                <option value="LINE_PUN_TALE">Talegaon Suburban Hub ➔ Pune Central (601 Suburban Link)</option>
                <option value="TALEGAON">Talegaon Town Link (Legacy)</option>
                <option value="GODAVARI">Godavari Transit Shuttle (Legacy)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-800"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday (Peak Railway Transit)</option>
                  <option value="Saturday">Saturday (Weekend Outing)</option>
                  <option value="Sunday">Sunday (Return to Campus)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Departure Slot</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-800"
                >
                  <option value="08:50">08:50 AM (Morning Inbound)</option>
                  <option value="09:00">09:00 AM (Morning Peak)</option>
                  <option value="10:00">10:00 AM (Off-Peak)</option>
                  <option value="13:55">01:55 PM (Midday)</option>
                  <option value="16:30">04:30 PM (Pre-Class End)</option>
                  <option value="17:30">05:30 PM (Class Dismissal)</option>
                  <option value="18:15">06:15 PM (Evening Peak Outbound)</option>
                  <option value="18:30">06:30 PM (Connecting Train Window)</option>
                  <option value="19:40">07:40 PM (Late Transit)</option>
                  <option value="20:00">08:00 PM (Night Inbound)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Model Key Drivers */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-800" />
              Primary Drivers for this Prediction:
            </span>
            <ul className="text-xs text-slate-600 font-semibold space-y-1 list-disc list-inside">
              {prediction.keyDrivers.map((driver, idx) => (
                <li key={idx}>{driver}</li>
              ))}
            </ul>
          </div>

          {/* Limitations Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-1">
            <span className="font-black text-amber-900 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Operational Limitation Note:
            </span>
            <p className="text-amber-800 font-medium">
              Data records advance <strong>booking registrations</strong>. Actual boardings and no-shows are not recorded in institute logs. Residual confidence interval ({prediction.confidenceRange}) reflects small-sample uncertainty.
            </p>
          </div>
        </div>

        {/* Right: Output Prediction & Metrics */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Prediction Scorecard */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-teal-400 uppercase tracking-widest">
                  {prediction.route} • {prediction.dayOfWeek} • {prediction.timeSlot}
                </span>
                <h3 className="text-2xl font-black tracking-tight mt-1">Predicted Recorded Demand</h3>
              </div>
              <RiskBadge riskLevel={prediction.riskLevel} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Expected Bookings</span>
                <div className="text-3xl font-black text-teal-400 mt-1">{prediction.predictedDemand}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">90% CI: {prediction.confidenceRange}</div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Bus Capacity</span>
                <div className="text-3xl font-black text-white mt-1">{prediction.busCapacity}</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Seats / vehicle</div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Expected Utilization</span>
                <div className="text-3xl font-black text-white mt-1">{prediction.expectedUtilization}%</div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Threshold: 70% / 95%</div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-bold uppercase">Seats Remaining</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {prediction.excessDemand > 0 ? `-${prediction.excessDemand}` : remainingSeats}
                </div>
                <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  {prediction.excessDemand > 0 ? 'Excess demand!' : 'Available seats'}
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Timeline Chart */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-900">Historical Average vs. Model Forecast Timeline</h3>
                <p className="text-xs text-slate-500 font-semibold">Comparing route pattern across typical day schedule</p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded uppercase">Recharts</span>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prediction.timelineData}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="historical" stroke="#64748b" fillOpacity={1} fill="url(#colorHist)" name="Historical Avg" />
                  <Area type="monotone" dataKey="predicted" stroke="#0284c7" fillOpacity={1} fill="url(#colorPredicted)" name="Model Forecast" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* Model Benchmark & Comparison Section */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sky-800" />
            <h3 className="text-base font-black text-slate-900">Empirical Model Benchmarking (Chronological Validation)</h3>
          </div>
          <span className="text-xs text-slate-500 font-bold">Split: {metrics.n_train} Train / {metrics.n_test} Test</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-bold divide-y divide-slate-200 text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2.5">Model Architecture</th>
                  <th className="p-2.5 text-center">Train MAE</th>
                  <th className="p-2.5 text-center">Test MAE</th>
                  <th className="p-2.5 text-center">Test RMSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-black text-slate-900">Historical Baseline (Mean)</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.HistoricalBaseline.train_mae}</td>
                  <td className="p-2.5 text-center text-emerald-700 font-black">{metrics.models.HistoricalBaseline.test_mae}</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.HistoricalBaseline.test_rmse}</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-black text-slate-900">Ridge Regression (L2)</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.RidgeRegression.train_mae}</td>
                  <td className="p-2.5 text-center text-sky-700 font-black">{metrics.models.RidgeRegression.test_mae}</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.RidgeRegression.test_rmse}</td>
                </tr>
                <tr className="hover:bg-slate-50 bg-sky-50/50">
                  <td className="p-2.5 font-black text-sky-900">Random Forest Regressor (Deployed)</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.RandomForestRegressor.train_mae}</td>
                  <td className="p-2.5 text-center text-sky-800 font-black">{metrics.models.RandomForestRegressor.test_mae}</td>
                  <td className="p-2.5 text-center text-slate-600">{metrics.models.RandomForestRegressor.test_rmse}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Feature Importance List */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-700 uppercase">Top Random Forest Feature Importances:</span>
            <div className="space-y-1.5">
              {featureImportance.slice(0, 5).map((f, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="font-mono text-slate-800 font-bold">{f.feature}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-sky-800 h-2 rounded-full" style={{ width: `${f.importance * 100}%` }}></div>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px]">{(f.importance * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
