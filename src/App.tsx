import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Download, Copy, Check, FileText, AlertCircle, FileUp, Loader2, X } from 'lucide-react';
import './index.css';

const DEFAULT_PROMPT = `System Role & Objective
You are a Senior Academic Strategist and Data Extraction Engine. Your mission is to perform a longitudinal analysis on a provided set of engineering exam documents to build a "Predictive Success Framework." You must identify the underlying "Problem Archetypes" (the logic/DNA of the questions) and calculate the "Yield" (points vs. learning effort) for every recurring topic.

Your goal is to equip the user with an Objective Data Dashboard that allows them to see exactly where marks are hidden and how to spend their limited time to reach their target. This data will be used to generate an automated PDF cover page.

Phase 1: Deep Data Analysis (Internal Process)
Before generating any output, you must internally perform a multi-dimensional analysis:

Archetype Identification: Group questions that share the same underlying mathematical or logical "recipe." Treat variations in physical setups as unique sub-types of the same archetype.
Frequency & Mark Weighting: Analyze the provided years to determine how many marks each archetype contributes to the total exam on average.
Redundancy Filtering: Prioritize the most recent 3 years for specific data mapping.
The Spanning Check: Actively verify if a question, diagram, or sub-problem continues onto the next page. If it does, you MUST include both pages in the JSON.

Phase 2: Technical Data Extraction (JSON Output)
You must output ONLY valid, minified JSON first. No conversational text, no markdown code blocks. This JSON must include a strategicDashboard object containing the data for the PDF cover page.

Data Schema:
{
  "examMetadata": {
    "examTitle": "String",
    "totalUniqueArchetypes": "Number",
    "examPredictabilityScore": "String (0-100%)",
    "estimatedPassThresholdMarks": "Number"
  },
  "strategicDashboard": {
    "roiMatrix": [
      {
        "topic": "String",
        "avgMarks": "Number",
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
        "topic": "String",
        "twistDescription": "String (Description of the niche variation)",
        "yearsSeen": ["String"]
      }
    ]
  },
  "categories": [
    {
      "categoryName": "String",
      "statisticalYield": "String",
      "subtitle": "String (List of questions included)",
      "pagesToExtract": [
        {
          "fileName": "String",
          "pageNumber": "Number",
          "stampText": "String (Label, e.g., '2025 - Q1 [Topic]')"
        }
      ]
    }
  ],
  "uncategorized": []
}

Phase 3: The Strategic Game Plan (Human-Readable Dashboard)
After the JSON, provide an exhaustive, objective "Master Plan." Do not make recommendations; provide the data for the user to make their own choices.

The Yield & ROI Table: A clear table showing Topic | Average Marks | Learning Complexity | Frequency (%).
The Frequency Heatmap: A visual list or table showing exactly which years each topic appeared to identify "rotational" or "guaranteed" topics.
The "Professor Twists" Log: Identify "niche" or "edge case" questions that only appear once every few years. Label these clearly so the user knows they are low-probability but high-difficulty.

Extraction & Accuracy Rules
The Spanning Rule: If a question or its required diagrams/charts span multiple pages, you MUST create a separate page object for every relevant page.
Zero-Inference Mapping: Treat the data as immutable facts. Do not "guess" a page number; verify it.
Minimalist Selection: Even if a topic is frequent, only extract the most unique or most representative versions (prioritizing the latest years).
Analyze the provided documents and generate the Complete Strategic Analysis now.`;

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

  const createTitlePage = async (pdfDoc: PDFDocument, titleText: string, subtitleText: string) => {
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Add a blank page
    const page = pdfDoc.addPage([612, 792]); // Standard 8.5x11 inches
    const { width, height } = page.getSize();
    
    // Draw Category Title
    page.drawText(titleText, {
      x: 50,
      y: height / 2 + 100,
      size: 24,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    // Draw Top Right Category Name
    const topRightTextWidth = fontRegular.widthOfTextAtSize(titleText, 12);
    page.drawText(titleText, {
      x: width - topRightTextWidth - 30,
      y: height - 40,
      size: 12,
      font: fontRegular,
      color: rgb(0, 0, 0),
    });

    // Draw subtitle "Includes:"
    page.drawText("Includes:", {
      x: 100,
      y: height / 2 + 50,
      size: 18,
      font: font,
      color: rgb(0, 0, 0)
    });

    // Draw bullets
    const bullets = subtitleText.split(',').map(b => b.trim());
    let currentY = height / 2 + 20;
    
    for (const bullet of bullets) {
      page.drawText(`• ${bullet}`, {
        x: 120,
        y: currentY,
        size: 14,
        font: fontRegular,
        color: rgb(0, 0, 0)
      });
      currentY -= 25;
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
      page.drawText("Avg Marks", { x: 350, y: currentY, size: 10, font: fontBold });
      page.drawText("Complexity", { x: 430, y: currentY, size: 10, font: fontBold });
      page.drawText("Freq %", { x: 510, y: currentY, size: 10, font: fontBold });
      
      currentY -= 10;
      page.drawLine({ start: { x: 50, y: currentY }, end: { x: 560, y: currentY }, thickness: 2, color: rgb(0,0,0) });
      currentY -= 15;

      for (const row of config.strategicDashboard.roiMatrix) {
        let topic = row.topic || "";
        if (topic.length > 55) topic = topic.substring(0, 52) + "...";

        page.drawText(topic, { x: 50, y: currentY, size: 10, font: fontRegular });
        page.drawText(String(row.avgMarks || ""), { x: 350, y: currentY, size: 10, font: fontRegular });
        page.drawText(row.complexity || "", { x: 430, y: currentY, size: 10, font: fontRegular });
        page.drawText(row.frequencyPercent || "", { x: 510, y: currentY, size: 10, font: fontRegular });
        currentY -= 20;
      }
      currentY -= 20;
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
      currentY -= 20;
      for (const twist of config.strategicDashboard.professorTwists) {
        let desc = twist.twistDescription || "";
        if (desc.length > 80) desc = desc.substring(0, 77) + "...";

        page.drawText(`[${(twist.yearsSeen || []).join(',')}] ${twist.topic}`, { x: 50, y: currentY, size: 10, font: fontBold });
        currentY -= 15;
        page.drawText(`- ${desc}`, { x: 60, y: currentY, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
        currentY -= 20;
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
      // 1. Parse JSON
      const config = JSON.parse(jsonInput);
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
        const catName = category.categoryName || "Uncategorized";
        const subtitle = category.subtitle || "";
        const pagesToExtract = category.pagesToExtract || [];

        // Create the title page
        await createTitlePage(masterPdf, catName, subtitle);

        for (const pageData of pagesToExtract) {
          const filename = pageData.fileName;
          const pIndex = (pageData.pageNumber || 1) - 1; // 0-indexed
          const stampText = pageData.stampText || "";

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
          copiedPage.drawText(stampText, {
            x: width - fontBold.widthOfTextAtSize(stampText, 18) - 30, // Align rightish
            y: height - 50,
            size: 18,
            font: fontBold,
            color: rgb(1, 0, 0), // Red text
          });
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
              Copy this prompt to the AI, attach your PDFs, and generate the JSON structure.
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
            <h2>Upload Local PDFs</h2>
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
              Paste the JSON output precisely as generated by the AI model.
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
