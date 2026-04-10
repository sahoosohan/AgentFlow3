// src/pages/ReportViewer.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Button from "../components/Button";
import Badge from "../components/Badge";
import Skeleton from "../components/Skeleton";
import Card from "../components/Card";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../api";
import {
  ArrowLeft,
  Printer,
  Copy,
  Share2,
  Download,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";

const isPlaceholderTitle = (value) => {
  const title = value?.trim();
  if (!title) return true;

  return /^(page\s*\d+|page\s*\d+\s*of\s*\d+|p\s*\d+|untitled report|report)$/i.test(
    title
  );
};

const extractTitleFromSections = (sections = []) => {
  const patterns = [
    /\*\*Paper title:\*\*\s*(.+)/i,
    /\*\*Paper:\*\*\s*(.+)/i,
  ];

  for (const section of sections) {
    const content = section?.content || "";
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match?.[1]?.trim()) {
        return match[1].trim();
      }
    }
  }

  return "";
};

const ReportViewer = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Fetch report data
  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        setLoading(true);
        const data = await api.getReport(reportId);
        setReport(data);
      } catch (err) {
        setError(err.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  // Build TOC from report content sections
  const toc =
    report?.content?.sections?.map((s, i) => ({
      id: s.heading?.toLowerCase().replace(/\s+/g, "-") || `section-${i}`,
      title: s.heading || `Section ${i + 1}`,
    })) || [];

  // Add executive summary and data analysis as TOC items if they exist
  const fullToc = [
    ...(report?.content?.executive_summary
      ? [{ id: "executive-summary", title: "Executive Summary" }]
      : []),
    ...(report?.content?.data_analysis
      ? [{ id: "data-analysis", title: "Data Analysis" }]
      : []),
    ...(report?.content?.workflow_notes
      ? [{ id: "workflow-notes", title: "Workflow Notes" }]
      : []),
    ...toc,
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setScrollProgress(`${(scrollPx / winHeightPx) * 100}%`);

      // TOC active logic
      const sections = fullToc.map((item) => document.getElementById(item.id));
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPx + 200) {
          setActiveSection(fullToc[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fullToc]);

  const handlePrint = () => window.print();

  const handleCopy = async () => {
    const text =
      report?.content?.executive_summary ||
      [
        report?.content?.title || "Report",
        ...(report?.content?.sections || []).map(
          (section) => `${section.heading || "Section"}\n${section.content || ""}`
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    await navigator.clipboard.writeText(text);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans pb-24">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
          <Skeleton className="w-64 h-8 mb-4" />
          <Skeleton className="w-full h-4 mb-2" />
          <Skeleton className="w-3/4 h-4 mb-8" />
          <Card className="p-12">
            <Skeleton className="w-2/3 h-10 mb-6" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-5/6 h-4 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-4/5 h-4 mb-6" />
            <Skeleton className="w-1/2 h-8 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
            <Skeleton className="w-full h-4 mb-3" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans pb-24">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 mt-24 text-center">
          <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Report Not Found
          </h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const content = report?.content || {};
  const displayTitle =
    !isPlaceholderTitle(content.title)
      ? content.title
      : extractTitleFromSections(content.sections) ||
        report?.title ||
        "Untitled Report";

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-sans pb-24">
      {/* Reading Progress Bar */}
      <div
        className="print:hidden fixed top-0 left-0 h-1 bg-primary z-[100] transition-all duration-150 ease-out"
        style={{ width: scrollProgress }}
      ></div>

      <div className="print:hidden">
        <Navbar />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        {/* Top Action Bar */}
        <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 text-primary dark:text-primary-dark hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-1">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="hover:text-primary transition-colors"
                >
                  Reports
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
                <span>{displayTitle}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy className="w-4 h-4" />}
              onClick={handleCopy}
            >
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Share2 className="w-4 h-4" />}
            >
              Share
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              className="shadow-md"
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Sidebar: TOC */}
          {fullToc.length > 0 && (
            <div className="print:hidden hidden lg:block w-64 shrink-0">
              <div className="sticky top-24 pt-2">
                <h4 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-4 pl-3">
                  Contents
                </h4>
                <ul className="space-y-1">
                  {fullToc.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          document
                            .getElementById(item.id)
                            ?.scrollIntoView({ behavior: "smooth" });
                          setActiveSection(item.id);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          activeSection === item.id
                            ? "bg-indigo-50/80 text-primary dark:bg-indigo-900/30 dark:text-primary-dark border-l-2 border-primary"
                            : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 border-l-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-grow max-w-4xl">
            {/* Metadata Card */}
            <div className="print:hidden bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 mb-8 shadow-sm flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Status
                </span>
                <Badge
                  variant="success"
                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1 border-none py-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified by AI
                </Badge>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Document ID
                </span>
                <span className="text-sm font-mono text-slate-700 dark:text-slate-300 font-medium tracking-tight">
                  {reportId?.slice(0, 12) || "N/A"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Accuracy
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {report?.extraction_accuracy
                    ? `${(report.extraction_accuracy * 100).toFixed(1)}%`
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Generated
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {report?.created_at
                    ? new Date(report.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "N/A"}
                </span>
              </div>
            </div>

            {/* Document Paper Canvas */}
            <div
              id="report-content-body"
              className="bg-white dark:bg-card-dark rounded-2xl p-8 sm:p-12 lg:p-16 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-12 print:border-none print:p-0 print:mb-0"
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-8">
                {displayTitle}
              </h1>

              {/* Executive Summary */}
              {content.executive_summary && (
                <div id="executive-summary" className="scroll-mt-24 mb-12">
                  <h2 className="text-3xl font-bold text-primary dark:text-primary-dark border-b-2 border-indigo-100 dark:border-indigo-900/50 pb-3 mb-6">
                    Executive Summary
                  </h2>
                  <div className="text-[17px] text-slate-700 dark:text-slate-300 leading-[1.8] whitespace-pre-line">
                    {content.executive_summary}
                  </div>
                </div>
              )}

              {/* Data Analysis */}
              {content.data_analysis && (
                <div id="data-analysis" className="scroll-mt-24 mb-12">
                  <h2 className="text-3xl font-bold text-primary dark:text-primary-dark border-b-2 border-indigo-100 dark:border-indigo-900/50 pb-3 mb-6">
                    Data Analysis
                  </h2>
                  <div className="text-[17px] text-slate-700 dark:text-slate-300 leading-[1.8] whitespace-pre-line">
                    {content.data_analysis}
                  </div>
                </div>
              )}

              {/* Workflow Notes */}
              {content.workflow_notes && (
                <div id="workflow-notes" className="scroll-mt-24 mb-12">
                  <h2 className="text-3xl font-bold text-primary dark:text-primary-dark border-b-2 border-indigo-100 dark:border-indigo-900/50 pb-3 mb-6">
                    Workflow Notes
                  </h2>
                  <div className="text-[17px] text-slate-700 dark:text-slate-300 leading-[1.8] whitespace-pre-line">
                    {content.workflow_notes}
                  </div>
                </div>
              )}

              {/* Dynamic Sections */}
              {content.sections?.map((section, idx) => {
                const sectionId =
                  section.heading?.toLowerCase().replace(/\s+/g, "-") ||
                  `section-${idx}`;
                return (
                  <div key={idx} id={sectionId} className="scroll-mt-24 mb-12">
                    <h2 className="text-3xl font-bold text-primary dark:text-primary-dark border-b-2 border-indigo-100 dark:border-indigo-900/50 pb-3 mb-6">
                      {section.heading}
                    </h2>
                    <div
                      className="prose prose-slate dark:prose-invert max-w-none 
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-[1.8] prose-p:text-[17px]
                      prose-strong:text-primary dark:prose-strong:text-primary-dark
                      prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:text-primary dark:prose-code:text-indigo-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                      prose-pre:bg-slate-900 prose-pre:text-slate-300 prose-pre:rounded-xl prose-pre:p-6
                      prose-ul:list-disc prose-li:text-slate-700 dark:prose-li:text-slate-300
                      prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-900/20 prose-blockquote:py-4 prose-blockquote:pl-6 prose-blockquote:rounded-r-xl"
                    >
                      <ReactMarkdown>{section.content || ""}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}

              {/* Extraction Accuracy Chart */}
              {report?.extraction_accuracy && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 md:p-8 mt-10 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                        Extraction Accuracy
                      </p>
                      <p className="text-4xl font-black text-slate-900 dark:text-white">
                        {(report.extraction_accuracy * 100).toFixed(2)}%
                      </p>
                    </div>
                    <span className="text-sm font-bold text-success">
                      AI Verified
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-indigo-400 h-3 rounded-full transition-all duration-1000"
                      style={{ width: `${report.extraction_accuracy * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Feedback Section */}
            <div className="print:hidden flex flex-col items-center justify-center pt-8 border-t border-slate-200 dark:border-slate-800">
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-4">
                Was this report helpful?
              </p>

              {!feedbackSubmitted ? (
                <div className="flex gap-4">
                  <Button
                    variant={feedback === "up" ? "primary" : "outlined"}
                    onClick={() => {
                      setFeedback("up");
                      setFeedbackSubmitted(true);
                    }}
                    className="px-6 py-2 bg-white dark:bg-card-dark"
                  >
                    <ThumbsUp
                      className={`w-4 h-4 mr-2 ${feedback === "up" ? "text-white" : "text-slate-500"}`}
                    />{" "}
                    Yes
                  </Button>
                  <Button
                    variant={feedback === "down" ? "danger" : "outlined"}
                    onClick={() => {
                      setFeedback("down");
                      setShowFeedbackInput(true);
                    }}
                    className="px-6 py-2 bg-white dark:bg-card-dark"
                  >
                    <ThumbsDown
                      className={`w-4 h-4 mr-2 ${feedback === "down" ? "text-white" : "text-slate-500"}`}
                    />{" "}
                    No
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-success bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium inline-block">
                    Thank you for your feedback!
                  </span>
                </div>
              )}

              {showFeedbackInput && !feedbackSubmitted && (
                <div className="w-full max-w-md mt-6 animate-[fadeInUp_0.3s_ease-out]">
                  <textarea
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary mb-3 text-slate-900 dark:text-white"
                    rows="3"
                    placeholder="Tell us what we can improve..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  ></textarea>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => setFeedbackSubmitted(true)}
                  >
                    Submit Feedback
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="print:hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">AgentFlow</span>
          <span>© 2026 Sohan Sahoo. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-900 dark:hover:text-white">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white">
            System Status
          </a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white">
            Documentation
          </a>
        </div>
      </footer>
    </div>
  );
};

export default ReportViewer;
