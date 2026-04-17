import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, Copy, Check, FileText, AlertCircle, FileUp, Loader2, X } from 'lucide-react';
import './index.css';

const DEFAULT_PROMPT = `System Role & Objective
You are a Senior Academic Strategist and Data Extraction Engine. Your mission is to perform a longitudinal analysis on a provided set of engineering exam documents to build a "Predictive Success Framework."

Phase 1: Deep Data Analysis (Internal Process)
Archetype Identification: Group questions sharing the same logical recipe. Treat physical setup variations as sub-types.
Frequency & Mark Weighting: Calculate average marks per archetype across all provided years.
Redundancy Filtering: Prioritize most recent 3 years for page extraction.
The Spanning Check: If a question spans pages, MUST include all pages in JSON.

Phase 2: Output Rules
Output ONLY valid minified JSON. No conversational text. No markdown. No Phase 3 tables. All analytical data must be embedded in the JSON for automated PDF rendering.

Data Schema:
{
  "examMetadata": {
    "examTitle": "String (e.g., 'ELEC 448 / MREN 348: Introduction to Robotics')",
    "totalUniqueArchetypes": "Number",
    "examPredictabilityScore": "String (0-100%)",
    "estimatedPassThresholdMarks": "String (e.g., '50%')"
  },
  "strategicDashboard": {
    "roiMatrix": [
      {
        "topic": "String (e.g., 'Differential Kinematics')",
        "avgMarks": "String (e.g., '24%')",
        "yield": "String (e.g., 'Very High')",
        "complexity": "String (Low/Med/High)",
        "frequencyPercent": "String (e.g., '100%')"
      }
    ],
    "frequencyHeatmap": [
      {
        "topic": "String",
        "yearsPresent": ["String"]
      }
    ],
    "professorTwists": [
      {
        "topic": "String (brief topic label, e.g. 'Force Control')",
        "twistDescription": "String — Write a DETAILED, actionable paragraph (2 sentences minimum). Explain: (1) exactly what the unusual variation is and how it differs from the standard question. Be specific enough that a student who reads this can immediately recognize the twist in an exam and know how to respond.",
        "yearsSeen": ["String"]
      }
    ]
  },
  "categories": [
    {
      "categoryName": "String",
      "statisticalYield": "String",
      "subtitle": "String (comma-separated topic list)",
      "questionsIncluded": ["String (e.g., '2025 Q1', '2022 Q1')"],
      "pagesToExtract": [
        {
          "fileName": "String",
          "pageNumber": "Number",
          "year": "String (e.g., '2025')",
          "questionLabel": "String (e.g., 'Q1')",
          "topicTag": "String (e.g., '[Spherical 2RP Kinematics]')"
        }
      ]
    }
  ],
  "uncategorized": []
}

Extraction & Accuracy Rules
The Spanning Rule: Create a separate page object for every relevant page a question spans.
Zero-Inference Mapping: Do not guess page numbers; verify them.
Minimalist Selection: Extract the most unique or representative versions, prioritizing latest years.
Plain Text Only: ALL string values in the JSON must use plain ASCII text. Do NOT use LaTeX notation (e.g. no $symbols$, no \\omega, no \\frac, no backslashes). Write all math concepts in plain English (e.g. write "omega_z" not "$\\omega_z$", write "J-transpose" not "$J^T$"). The JSON will be parsed programmatically and LaTeX will cause a fatal crash.
Analyze the provided documents and generate the JSON now.`;

interface PDFMap {
  [filename: string]: ArrayBuffer;
}

function App() {
  const [copied, setCopied] = useState(false);
  const [pdfs, setPdfs] = useState<PDFMap>({});
  const [jsonInput, setJsonInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(DEFAULT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPdfs: PDFMap = { ...pdfs };
    let filesProcessed = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newPdfs[file.name] = event.target.result as ArrayBuffer;
        }
        filesProcessed++;
        if (filesProcessed === files.length) {
          setPdfs(newPdfs);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const removePdf = (filename: string) => {
    const newPdfs = { ...pdfs };
    delete newPdfs[filename];
    setPdfs(newPdfs);
  };

  const createTitlePage = async (pdfDoc: PDFDocument, category: any) => {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    
    // Draw Category Title (large, centered)
    page.drawText(category.categoryName || "", {
      x: 50,
      y: height / 2 + 120,
      size: 22,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Draw Statistical Yield below title
    const yieldText = `Statistical Yield: ${category.statisticalYield || 'N/A'}`;
    page.drawText(yieldText, {
      x: 50,
      y: height / 2 + 90,
      size: 11,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Draw "Questions Included in This Section"
    page.drawText("Questions Included:", {
      x: 50,
      y: height / 2 + 55,
      size: 14,
      font: font,
      color: rgb(0, 0, 0)
    });

    const questions: string[] = category.questionsIncluded || [];
    let qY = height / 2 + 30;
    for (const q of questions) {
      page.drawText(`- ${q}`, { x: 65, y: qY, size: 12, font: fontRegular, color: rgb(0, 0, 0) });
      qY -= 18;
    }

    // Draw "Topics Covered"
    page.drawText("Topics Covered:", {
      x: 50,
      y: qY - 10,
      size: 14,
      font: font,
      color: rgb(0, 0, 0)
    });

    const bullets = (category.subtitle || "").split(',').map((b: string) => b.trim());
    let currentY = qY - 30;
    for (const bullet of bullets) {
      page.drawText(`- ${bullet}`, { x: 65, y: currentY, size: 12, font: fontRegular, color: rgb(0, 0, 0) });
      currentY -= 18;
    }
  };

  const createMasterCoverPage = async (pdfDoc: PDFDocument, config: any) => {
    if (!config.examMetadata && !config.strategicDashboard) return;

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();
    
    let currentY = height - 60;

    // 1. Exam Title & Metrics
    if (config.examMetadata) {
      page.drawText(config.examMetadata.examTitle || "Strategic Master Study Guide", {
        x: 50, y: currentY, size: 20, font: fontBold, color: rgb(0, 0, 0)
      });
      currentY -= 30;

      const metrics = [
        `Predictability: ${config.examMetadata.examPredictabilityScore || 'N/A'}`,
        `Pass Threshold: ${config.examMetadata.estimatedPassThresholdMarks || 'N/A'} marks`,
        `Unique Archetypes: ${config.examMetadata.totalUniqueArchetypes || 'N/A'}`
      ];
      
      page.drawText(metrics.join('  |  '), {
        x: 50, y: currentY, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2)
      });
      currentY -= 40;
    }

      // 2. Yield & ROI Matrix Table
    if (config.strategicDashboard?.roiMatrix) {
      page.drawText("Yield & ROI Matrix", { x: 50, y: currentY, size: 16, font: fontBold, color: rgb(0, 0, 0) });
      currentY -= 20;

      // Table Header
      page.drawText("Topic", { x: 50, y: currentY, size: 10, font: fontBold });
      page.drawText("Avg Marks", { x: 280, y: currentY, size: 10, font: fontBold });
      page.drawText("Complexity", { x: 350, y: currentY, size: 10, font: fontBold });
      page.drawText("Freq %", { x: 430, y: currentY, size: 10, font: fontBold });
      page.drawText("Yield (ROI)", { x: 480, y: currentY, size: 10, font: fontBold });
      
      currentY -= 10;
      page.drawLine({ start: { x: 50, y: currentY }, end: { x: 560, y: currentY }, thickness: 2, color: rgb(0,0,0) });
      currentY -= 15;

      for (const row of config.strategicDashboard.roiMatrix) {
        let topic = row.topic || "";
        if (topic.length > 40) topic = topic.substring(0, 37) + "...";
        let yieldVal = row.yield || "";
        if (yieldVal.length > 15) yieldVal = yieldVal.substring(0, 13) + "...";

        page.drawText(topic, { x: 50, y: currentY, size: 9, font: fontRegular });
        page.drawText(String(row.avgMarks || ""), { x: 280, y: currentY, size: 9, font: fontRegular });
        page.drawText(row.complexity || "", { x: 350, y: currentY, size: 9, font: fontRegular });
        page.drawText(row.frequencyPercent || "", { x: 430, y: currentY, size: 9, font: fontRegular });
        page.drawText(yieldVal, { x: 480, y: currentY, size: 9, font: fontRegular });
        currentY -= 18;
      }
      currentY -= 15;
    }

    // 3. Frequency Heatmap
    if (config.strategicDashboard?.frequencyHeatmap && currentY > 150) {
      page.drawText("Frequency Heatmap", { x: 50, y: currentY, size: 16, font: fontBold, color: rgb(0, 0, 0) });
      currentY -= 20;
      for (const item of config.strategicDashboard.frequencyHeatmap) {
        let topic = item.topic || "";
        if (topic.length > 40) topic = topic.substring(0, 37) + "...";
        const years = (item.yearsPresent || []).join(', ');
        page.drawText(`${topic}:`, { x: 50, y: currentY, size: 10, font: fontBold });
        page.drawText(years, { x: 280, y: currentY, size: 10, font: fontRegular });
        currentY -= 15;
      }
      currentY -= 20;
    }

    // 4. Professor Twists
    if (config.strategicDashboard?.professorTwists && currentY > 100) {
      page.drawText("Professor Twists Log", { x: 50, y: currentY, size: 16, font: fontBold, color: rgb(0, 0, 0) });
      currentY -= 22;

      // Word-wrap helper: break a string into lines of maxChars
      const wrapText = (text: string, maxChars: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
          if ((current + ' ' + word).trim().length > maxChars) {
            if (current) lines.push(current.trim());
            current = word;
          } else {
            current = (current + ' ' + word).trim();
          }
        }
        if (current) lines.push(current.trim());
        return lines;
      };

      for (const twist of config.strategicDashboard.professorTwists) {
        if (currentY < 60) break;
        const header = `[${(twist.yearsSeen || []).join(', ')}]  ${twist.topic}`;
        page.drawText(header, { x: 50, y: currentY, size: 10, font: fontBold });
        currentY -= 15;

        const descLines = wrapText(twist.twistDescription || '', 105);
        for (const line of descLines) {
          if (currentY < 60) break;
          page.drawText(`  ${line}`, { x: 60, y: currentY, size: 9, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
          currentY -= 13;
        }
        currentY -= 8;
      }
    }
  };

  const generatePDF = async () => {
    setErrorText('');
    setSuccessText('');
    
    if (Object.keys(pdfs).length === 0) {
      setErrorText("Please upload at least one PDF file.");
      return;
    }
    
    if (!jsonInput.trim()) {
      setErrorText("Please paste the JSON map generated by the LLM.");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Parse JSON — sanitize LaTeX artifacts the AI may have slipped in
      const sanitized = jsonInput
        .replace(/\$([^$]*)\$/g, (_: string, inner: string) => inner.replace(/\\/g, ''))  // strip $...$ LaTeX
        .replace(/\\[a-zA-Z]+\{[^}]*\}/g, (m: string) => m.replace(/[\\{}]/g, ''))        // strip \cmd{...}
        .replace(/\\[a-zA-Z]+/g, (m: string) => m.replace('\\', ''));                      // strip bare \cmd
      const config = JSON.parse(sanitized);
      if (!config.categories) throw new Error("Invalid JSON: Missing 'categories' array.");

      // 2. Create Master Document
      const masterPdf = await PDFDocument.create();
      const loadedSourcePdfs: { [filename: string]: PDFDocument } = {};

      for (const [filename, buffer] of Object.entries(pdfs)) {
        loadedSourcePdfs[filename] = await PDFDocument.load(buffer);
      }

      const fontBold = await masterPdf.embedFont(StandardFonts.HelveticaBold);

      // Create the Master Dashboard Cover Page if data is available
      await createMasterCoverPage(masterPdf, config);

      // 3. Process each category
      for (const category of config.categories) {
        const pagesToExtract = category.pagesToExtract || [];

        // Create the title page
        await createTitlePage(masterPdf, category);

        for (const pageData of pagesToExtract) {
          const filename = pageData.fileName;
          const pIndex = (pageData.pageNumber || 1) - 1;
          // Support both old stampText and new split fields
          const year = pageData.year || "";
          const questionLabel = pageData.questionLabel || "";
          const topicTag = pageData.topicTag || "";
          // Fallback: parse stampText if new fields absent
          const stampText = pageData.stampText || `${year} - ${questionLabel} ${topicTag}`.trim();

          const sourcePdf = loadedSourcePdfs[filename];
          if (!sourcePdf) {
            console.warn(`File ${filename} not found in uploads.`);
            continue;
          }

          if (pIndex < 0 || pIndex >= sourcePdf.getPageCount()) {
            console.warn(`Page ${pIndex + 1} does not exist in ${filename}.`);
            continue;
          }

          const [copiedPage] = await masterPdf.copyPages(sourcePdf, [pIndex]);
          masterPdf.addPage(copiedPage);

          const { width, height } = copiedPage.getSize();

          // Top-right: year + question label (e.g. "2022 - Q1")
          const rightLabel = (year && questionLabel) ? `${year} - ${questionLabel}` : stampText.split('[')[0].trim();
          copiedPage.drawText(rightLabel, {
            x: width - fontBold.widthOfTextAtSize(rightLabel, 14) - 30,
            y: height - 42,
            size: 14,
            font: fontBold,
            color: rgb(1, 0, 0),
          });

          // Top-left: topic tag (e.g. "[Spherical 2RP Kinematics]")
          const leftLabel = topicTag || (stampText.includes('[') ? '[' + stampText.split('[').slice(1).join('[') : '');
          if (leftLabel) {
            copiedPage.drawText(leftLabel, {
              x: 30,
              y: height - 42,
              size: 14,
              font: fontBold,
              color: rgb(1, 0, 0),
            });
          }
        }
      }

      // 4. Serialize and Download
      const pdfBytes = await masterPdf.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Master_Study_Guide.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessText('PDF Generated successfully!');

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "An error occurred while generating the PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="header-icon">
            <FileText size={32} />
          </div>
          <div>
            <h1>Exam Slicer</h1>
            <p className="desc">
              12 Weeks of Content, 1 Day to Study? Been there! 
              <br />
              This the only reason I pass 100% of my exams despite never going to class.
            </p>
          </div>
        </div>
      </header>

      <div className="section-block split">
        <div className="step-col">
          <span className="step-marker">Step 01</span>
          <div className="col-header">
            <h2>Generate LLM Rules</h2>
            <p className="desc">
              Copy this prompt to the any GenAI, attach your PDFs, and generate the JSON structure.
            </p>
          </div>
          <button onClick={handleCopyPrompt} className="btn btn-full">
            {copied ? <Check size={24} /> : <Copy size={24} />}
            {copied ? 'Copied' : 'Copy Prompt'}
          </button>
        </div>

        <div className="step-col">
          <span className="step-marker">Step 02</span>
          <div className="col-header">
            <h2>Upload Past Exam Papers</h2>
            <p className="desc">
              Upload the exact same PDF files you sent to the LLM. Processing happens purely in-browser.
            </p>
          </div>
          
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="upload-zone"
          >
            <FileUp size={24} className="upload-icon" />
            <span className="upload-title">Select PDFs</span>
            <span className="upload-subtitle">No files are uploaded to any server</span>
          </div>
          
          <div className="file-list-container">
            {Object.keys(pdfs).length > 0 ? (
              <div className="file-list">
                {Object.keys(pdfs).map(name => (
                  <div key={name} className="file-item">
                    <span className="file-name" title={name}>{name}</span>
                    <button onClick={() => removePdf(name)} title="Remove">
                      <X size={14}/>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="file-list-empty">
                <span>No PDFs Selected</span>
              </div>
            )}
          </div>
        </div>

        <div className="step-col">
          <span className="step-marker">Step 03</span>
          <div className="col-header">
            <h2>Combine & Generate</h2>
            <p className="desc">
              Paste the JSON output precisely as generated by the AI model and generate your study guide.
            </p>
          </div>

          <textarea 
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"categories": [...]}'
          className="input-area"
          style={{ height: '160px', resize: 'vertical', marginBottom: '16px' }}
        />

        {errorText && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{errorText}</span>
          </div>
        )}

        {successText && (
          <div className="alert alert-success">
            <Check size={16} />
            <span>{successText}</span>
          </div>
        )}

        <div>
          <button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? <Loader2 size={18} className="spinner" /> : <Download size={18} />}
            {isGenerating ? 'Processing...' : 'Generate Master Study Guide'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

export default App;
