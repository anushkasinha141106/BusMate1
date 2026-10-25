import React, { useState } from 'react';
import { HelpCircle, MessageSquare, ShieldCheck, Phone, Mail, CheckCircle2, ChevronDown } from 'lucide-react';

export const HelpFeedbackPage = () => {
  const [openFaq, setOpenFaq] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    {
      q: 'How does BusMate predict if a bus will be crowded?',
      a: 'BusMate uses machine learning models that analyze historical travel data, day of the week, time slot, recent passenger demand, and local events (such as campus concerts or sports matches) to predict overcrowding risk.'
    },
    {
      q: 'What does "Explainable AI (SHAP)" mean for my trip?',
      a: 'SHAP (SHapley Additive exPlanations) highlights the exact factors contributing to a crowded bus—such as Friday evening rush hour or an event ending nearby—in plain, clear language.'
    },
    {
      q: 'How are seats allocated when a bus is overbooked?',
      a: 'BusMate uses a fair capacity-allocation policy under hard bus capacity limits. It considers schedule constraints, past trip denials, and legitimate priority needs (such as wheelchair accessibility) while ensuring zero demographic bias.'
    },
    {
      q: 'What should I do if my seat request is waitlisted?',
      a: 'The system automatically provides transparent reasons for the waitlist and recommends alternative departure times with available capacity (e.g. 20 minutes later).'
    }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const existing = JSON.parse(localStorage.getItem('smartbus_help_inquiries') || '[]');
    const newInquiry = { id: Date.now(), name, email, message, date: new Date().toLocaleDateString() };
    localStorage.setItem('smartbus_help_inquiries', JSON.stringify([newInquiry, ...existing]));
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Header */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#075985]" />
            <h1 className="text-2xl sm:text-[2.25rem] font-semibold font-heading text-slate-900 tracking-[-0.02em] leading-[1.25]">Help, Accessibility & Support</h1>
          </div>
          <p className="text-sm sm:text-base font-normal text-slate-600 mt-1 leading-relaxed">
            Frequently asked questions, accessibility controls, and passenger inquiry form.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: FAQs */}
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-semibold font-heading text-slate-900">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left p-4 font-semibold text-slate-900 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-4 text-sm text-slate-700 leading-relaxed border-t border-slate-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-sky-900 font-semibold text-base">
              <ShieldCheck className="w-5 h-5 text-[#075985]" />
              <span>Accessibility Commitment</span>
            </div>
            <p className="text-xs text-sky-950 leading-relaxed font-normal">
              BusMate enforces high-contrast WCAG AA standards, minimum 16px font sizes, 3 font scaling modes (Normal, Large, XL), keyboard focus outlines, ARIA labels, and multi-channel indicators (Color + Icon + Text) suitable for all users.
            </p>
          </div>
        </div>

        {/* Right: Contact / Inquiry Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-xl font-semibold font-heading text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#075985]" />
              <span>Submit Passenger Inquiry</span>
            </h2>

            {submitted && (
              <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Your message has been sent to our support team.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea
                  rows="4"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-sky-600 focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-sky-800 text-white font-extrabold text-sm rounded-lg hover:bg-sky-900 transition-colors shadow"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
};
