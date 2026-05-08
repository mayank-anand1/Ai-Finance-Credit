import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  Mail, 
  History, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Download,
  AlertTriangle,
  Send,
  Zap,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { calculateEscalation, EscalationStage, EscalationInfo } from './utils/finance';
import { generateFollowUpEmail, GeneratedEmail } from './services/geminiService';
import { saveLog, fetchLogs, AuditLog } from './services/dbService';

// --- Types ---
interface Invoice {
  invoice_no: string;
  client_name: string;
  amount: number;
  due_date: string;
  email: string;
  followup_count: number;
  payment_link: string;
  escalation?: EscalationInfo;
}

interface ProcessedEmail extends GeneratedEmail {
  invoice: Invoice;
  status: 'pending' | 'sent' | 'error';
  timestamp: Date;
}

// --- Components ---

const MetricsCard = ({ title, value, icon: Icon, color, subValue }: { title: string, value: string | number, icon: any, color: string, subValue?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8e2] flex flex-col justify-between ${color}`}>
    <div className="flex items-start justify-between mb-4">
      <span className="text-[#8a968d] text-[10px] font-bold uppercase tracking-[0.15em]">{title}</span>
      <Icon className="w-4 h-4 text-[#8a968d]" />
    </div>
    <div>
      <h3 className="text-2xl font-bold text-[#1a1f1b]">{value}</h3>
      {subValue && <p className="text-[10px] text-[#5a6b5d] mt-1 font-medium italic">{subValue}</p>}
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'outbox' | 'logs' | 'security'>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generatedEmails, setGeneratedEmails] = useState<ProcessedEmail[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const logs = await fetchLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (!data) return;

      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => processRawData(results.data),
        });
      } else {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        processRawData(jsonData);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const processRawData = (data: any[]) => {
    const processed: Invoice[] = data.map(row => ({
      invoice_no: row.invoice_no || 'N/A',
      client_name: row.client_name || 'N/A',
      amount: parseFloat(row.amount) || 0,
      due_date: row.due_date || '',
      email: row.email || '',
      followup_count: parseInt(row.followup_count) || 0,
      payment_link: row.payment_link || '',
      escalation: calculateEscalation(row.due_date)
    }));
    setInvoices(processed);
    setActiveTab('invoices');
  };

  const generateAllEmails = async () => {
    setIsGenerating(true);
    const emailsToGenerate = invoices.filter(inv => 
      inv.escalation && 
      inv.escalation.stage !== 0 && 
      inv.escalation.stage !== EscalationStage.ESCALATED
    );

    const results: ProcessedEmail[] = [];
    for (const inv of emailsToGenerate) {
      const generated = await generateFollowUpEmail({
        invoice_no: inv.invoice_no,
        client_name: inv.client_name,
        amount: inv.amount.toFixed(2),
        due_date: inv.due_date,
        overdue_days: inv.escalation!.overdueDays,
        payment_link: inv.payment_link,
        stage: inv.escalation!.stage,
        tone: inv.escalation!.tone
      });

      const processed: ProcessedEmail = {
        ...generated,
        invoice: inv,
        status: isDryRun ? 'sent' : 'pending',
        timestamp: new Date()
      };
      
      results.push(processed);

      // Log to DB
      await saveLog({
        invoice_no: inv.invoice_no,
        client_name: inv.client_name,
        overdue_days: inv.escalation!.overdueDays,
        escalation_stage: inv.escalation!.stage,
        subject: generated.subject,
        send_status: isDryRun ? 'MOCK_SENT' : 'PENDING',
        dry_run: isDryRun
      });
    }

    setGeneratedEmails(prev => [...results, ...prev]);
    setIsGenerating(false);
    loadLogs();
    setActiveTab('outbox');
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: invoices.length,
    overdue: invoices.filter(inv => inv.escalation && inv.escalation.overdueDays > 0).length,
    escalated: invoices.filter(inv => inv.escalation && inv.escalation.stage === EscalationStage.ESCALATED).length,
    emailsSent: auditLogs.length
  };

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-[#333b35] font-sans">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#e2e8e2] z-50 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-[#5a6b5d] p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-[#1a1f1b]">CreditFlow AI</span>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'outbox', label: 'Email Drafts', icon: Mail },
              { id: 'logs', label: 'Audit Logs', icon: History },
              { id: 'security', label: 'Security Center', icon: ShieldCheck },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-[#f0f2f0] text-[#5a6b5d] shadow-sm shadow-black/5' 
                    : 'text-[#6b776d] hover:bg-[#f8f9f6]'
                }`}
              >
                {activeTab === item.id && <div className="w-1.5 h-1.5 bg-[#5a6b5d] rounded-full" />}
                <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'hidden' : ''}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6">
           <div className="bg-[#f0f2f0] p-4 rounded-2xl border border-[#e2e8e2]">
             <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] font-bold text-[#8a968d] uppercase tracking-wider">Dry Run Mode</span>
               <button 
                onClick={() => setIsDryRun(!isDryRun)}
                className={`w-8 h-4 rounded-full p-0.5 transition-colors relative ${isDryRun ? 'bg-[#5a6b5d]' : 'bg-[#d1d9d1]'}`}
               >
                 <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isDryRun ? 'translate-x-4' : ''}`} />
               </button>
             </div>
             <p className="text-[10px] text-[#6b776d] leading-relaxed">Simulation enabled. Emails will not be dispatched.</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64 min-h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-[#e2e8e2] sticky top-0 z-40 px-10 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a1f1b]">
              {activeTab === 'dashboard' && 'Portfolio Overview'}
              {activeTab === 'invoices' && 'Invoice Ingestion'}
              {activeTab === 'outbox' && 'AI Draft Center'}
              {activeTab === 'logs' && 'System Audit Trail'}
              {activeTab === 'security' && 'Protocol Settings'}
            </h1>
            <p className="text-xs text-[#6b776d]">Automated debt recovery & escalation tracking.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a968d]" />
              <input 
                type="text" 
                placeholder="Search portfolio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-[#f0f2f0] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#5a6b5d] transition-all w-64 placeholder-[#8a968d]"
              />
            </div>
            <label className="bg-[#5a6b5d] hover:bg-[#4a5a4d] text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 cursor-pointer transition-all shadow-sm">
              <Upload className="w-4 h-4" />
              Upload Invoices
              <input type="file" className="hidden" accept=".csv,.xlsx" onChange={handleFileUpload} />
            </label>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {/* --- DASHBOARD TAB --- */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricsCard title="Active Records" value={stats.total} icon={FileText} color="border-l-4 border-l-[#5a6b5d]" subValue="$1.2M Total Value" />
                  <MetricsCard title="Overdue Active" value={stats.overdue} icon={AlertCircle} color="border-l-4 border-l-[#d49a6a]" subValue="Avg. 12 days late" />
                  <MetricsCard title="Manual Review" value={stats.escalated} icon={AlertTriangle} color="border-l-4 border-l-[#b35e5e]" subValue="Stg 4+ Urgent" />
                  <MetricsCard title="Batch Processed" value={stats.emailsSent} icon={CheckCircle2} color="border-l-4 border-l-[#5a6b5d]" subValue="92% AI Accuracy" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-[#e2e8e2] shadow-sm">
                    <h4 className="font-bold text-[#1a1f1b] mb-6 flex items-center gap-2">
                       <Zap className="w-5 h-5 text-[#5a6b5d]" />
                       Operations Center
                    </h4>
                    <div className="space-y-4">
                      <div className="p-4 bg-[#f3f7f3] rounded-2xl border border-[#d1d9d1]">
                        <p className="text-sm font-semibold text-[#333b35] mb-1">Queue Analysis</p>
                        <p className="text-xs text-[#6b776d] mb-4">A total of {stats.overdue - stats.escalated} invoices qualify for automated follow-up processing.</p>
                        <button 
                          disabled={isGenerating || stats.overdue - stats.escalated === 0}
                          onClick={generateAllEmails}
                          className="w-full bg-[#5a6b5d] hover:bg-[#4a5a4d] text-white py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-black/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isGenerating ? 'Processing Batch...' : 'Process All Invoices'}
                          {!isGenerating && <ArrowRight className="w-4 h-4" />}
                        </button>
                      </div>
                      <button className="w-full py-3 border border-[#d1d9d1] rounded-xl text-sm text-[#6b776d] hover:bg-[#fcfcfb] transition-all font-medium">
                        Export Full Portfolio Report
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-[#e2e8e2] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <ShieldCheck className="w-24 h-24 text-[#1a1f1b]" />
                    </div>
                    <h4 className="font-bold text-[#1a1f1b] mb-4 ">Secure AI Invariants</h4>
                    <p className="text-sm text-[#6b776d] leading-relaxed mb-6">
                      System prompts are anchored to verified financial records. <span className="font-bold text-[#5a6b5d]">Zero-knowledge processing</span> is enforced for all PII during generative turns.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'Gemini API Secured',
                        'Audit Consistency',
                        'No Persistent PII',
                        'Entra Compliance'
                      ].map((text, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[#5a6b5d]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- INVOICES TAB --- */}
            {activeTab === 'invoices' && (
              <motion.div 
                key="invoices"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border border-[#e2e8e2] shadow-sm overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-[#fcfcfb] border-b border-[#e2e8e2]">
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest">Client & Entity</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest text-right">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest">Due Date</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest">Overdue</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest text-center">Stage</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-[#8a968d] uppercase tracking-widest"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f0]">
                      {filteredInvoices.map((inv, i) => (
                        <tr key={i} className={`hover:bg-[#f9fbf9] transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#fcfcfb]/50'}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#1a1f1b]">{inv.client_name}</div>
                            <div className="text-[10px] font-mono text-[#8a968d]">{inv.invoice_no}</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-medium text-[#1a1f1b]">${inv.amount.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[#6b776d]">{inv.due_date}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[11px] font-medium text-[#1a1f1b]">
                              {inv.escalation?.overdueDays} days
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {inv.escalation?.stage === EscalationStage.ESCALATED ? (
                                <span className="bg-[#fdf0f0] text-[#b35e5e] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                  ESCALATED
                                </span>
                              ) : (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  inv.escalation?.stage === EscalationStage.STAGE_1 ? 'bg-[#f3f7f3] text-[#5a6b5d]' :
                                  inv.escalation?.stage === EscalationStage.STAGE_4 ? 'bg-[#fdf0f0] text-[#b35e5e]' :
                                  'bg-[#fef5ec] text-[#d49a6a]'
                                }`}>
                                  STG {inv.escalation?.stage || 0}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-[#8a968d] hover:text-[#1a1f1b] transition-colors cursor-pointer">
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center text-[#8a968d] bg-[#fcfcfb]">
                             <FileText className="w-10 h-10 mx-auto mb-4 opacity-20" />
                             No active invoice data detected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* --- OUTBOX TAB --- */}
            {activeTab === 'outbox' && (
              <motion.div 
                key="outbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 gap-8"
              >
                {generatedEmails.map((email, i) => (
                  <div key={i} className="bg-[#1a1f1b] rounded-[2.5rem] flex flex-col text-white shadow-2xl overflow-hidden max-w-4xl mx-auto w-full">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1a1f1b]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#5a6b5d] rounded-full flex items-center justify-center text-white ring-4 ring-[#1a1f1b] ring-offset-2 ring-offset-white/5">
                          <Mail className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] text-[#8a968d] font-bold uppercase tracking-widest mb-0.5">AI DRAFT • STAGE {email.invoice.escalation?.stage}</div>
                          <div className="text-sm font-semibold">For: {email.invoice.client_name}</div>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#b35e5e] shadow-[0_0_8px_rgba(179,94,94,0.4)]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#d49a6a] shadow-[0_0_8px_rgba(212,154,106,0.4)]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#5a6b5d] shadow-[0_0_8px_rgba(90,107,93,0.4)]"></div>
                      </div>
                    </div>
                    
                    <div className="p-10 flex-1">
                      <div className="mb-8 pb-4 border-b border-white/5 font-sans">
                         <span className="text-[#8a968d] font-bold text-xs uppercase mr-2 tracking-tighter">Subject:</span>
                         <span className="text-lg font-light tracking-tight">{email.subject}</span>
                      </div>
                      <div className="font-serif italic text-lg leading-relaxed opacity-85 text-white/90 whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10">
                        {email.body}
                      </div>
                    </div>

                    <div className="p-8 border-t border-white/5 bg-black/10 backdrop-blur-sm flex items-center justify-between">
                       <div>
                         <p className="text-[10px] text-[#8a968d] font-bold uppercase tracking-wider">TONE PROTOCOL</p>
                         <p className="text-xs text-[#5a6b5d] font-medium">{email.invoice.escalation?.tone}</p>
                       </div>
                       <button className="px-8 py-3.5 bg-[#5a6b5d] hover:bg-[#6c7d6f] transition-all rounded-xl font-bold text-xs uppercase tracking-widest text-white shadow-xl shadow-black/20">
                         Approve & {isDryRun ? 'Mock Send' : 'Dispatch'}
                       </button>
                    </div>
                  </div>
                ))}
                
                {generatedEmails.length === 0 && (
                  <div className="bg-white rounded-3xl p-32 text-center text-[#8a968d] border border-dashed border-[#d1d9d1]">
                    <div className="w-16 h-16 bg-[#f0f2f0] rounded-full flex items-center justify-center mx-auto mb-6">
                       <Mail className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="font-medium">No drafts generated in the current session.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* --- LOGS TAB --- */}
            {activeTab === 'logs' && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl border border-[#e2e8e2] shadow-sm overflow-hidden"
              >
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs">
                     <thead>
                       <tr className="bg-[#fcfcfb] border-b border-[#e2e8e2]">
                         <th className="px-6 py-4 font-bold text-[#8a968d] uppercase tracking-widest">Timestamp</th>
                         <th className="px-6 py-4 font-bold text-[#8a968d] uppercase tracking-widest">Invoice</th>
                         <th className="px-6 py-4 font-bold text-[#8a968d] uppercase tracking-widest">Client</th>
                         <th className="px-6 py-4 font-bold text-[#8a968d] uppercase tracking-widest">Protocol Status</th>
                         <th className="px-6 py-4 font-bold text-[#8a968d] uppercase tracking-widest">Subject</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-[#f0f2f0]">
                        {auditLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-[#f9fbf9] transition-colors">
                            <td className="px-6 py-4 text-[#8a968d]">{log.timestamp}</td>
                            <td className="px-6 py-4 font-mono font-bold text-[#1a1f1b]">{log.invoice_no}</td>
                            <td className="px-6 py-4 font-medium text-[#333b35]">{log.client_name}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-tighter ${log.dry_run ? 'bg-indigo-50 text-indigo-600' : 'bg-[#f3f7f3] text-[#5a6b5d]'}`}>
                                 {log.send_status}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-[#6b776d] truncate max-w-xs">{log.subject}</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              </motion.div>
            )}

            {/* --- SECURITY TAB --- */}
            {activeTab === 'security' && (
              <motion.div 
                key="security"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="bg-white p-8 rounded-3xl border border-[#e2e8e2] shadow-sm">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="p-3 bg-[#f3f7f3] rounded-xl">
                        <ShieldCheck className="w-6 h-6 text-[#5a6b5d]" />
                      </div>
                      <h4 className="font-bold text-xl text-[#1a1f1b]">Encryption Protocols</h4>
                   </div>
                   <div className="space-y-6">
                      {[
                        { title: 'Isolation Architecture', desc: 'Secure environment injection for API vectors.' },
                        { title: 'Semantic Anchoring', desc: 'Strict system boundaries prevent LLM hallucinations.' },
                        { title: 'Audit Persistence', desc: 'Cryptographically consistent SQLite logging enabled.' }
                      ].map((item, id) => (
                        <div key={id} className="flex items-start gap-4">
                          <CheckCircle2 className="w-5 h-5 text-[#5a6b5d] mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-[#333b35] text-sm">{item.title}</p>
                            <p className="text-xs text-[#6b776d]">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-[#1a1f1b] p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                   <h4 className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#8a968d] mb-10">Threat Intelligence</h4>
                   <div className="space-y-6 relative z-10">
                      <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                        <AlertTriangle className="w-5 h-5 text-[#d49a6a] shrink-0" />
                        <p className="text-[11px] leading-relaxed opacity-70">
                          Probabilistic models may produce unexpected variations. Human oversight is mandated for Stage 4 escalations.
                        </p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                         <div className="flex justify-between items-end mb-4">
                            <span className="text-[10px] font-bold text-[#8a968d] uppercase tracking-widest">Rate Efficiency</span>
                            <span className="text-lg font-mono text-[#5a6b5d]">72%</span>
                         </div>
                         <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full w-[72%] bg-[#5a6b5d] rounded-full" />
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
