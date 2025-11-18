import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign } from 'docx';

interface Finding {
  id: string;
  title: string;
  severity: string;
  description: string;
  recommendation: string;
  evidence?: any;
}

interface Assessment {
  domain: string;
  created_at: string;
  status: string;
}

interface ReportData {
  assessment: Assessment;
  findings: Finding[];
  rawData: any;
}

// Modern color palette
const COLORS = {
  primary: "0F172A",      // Dark blue-gray
  secondary: "3B82F6",    // Blue
  accent: "10B981",       // Green
  critical: "DC2626",     // Red
  high: "EA580C",         // Orange
  medium: "F59E0B",       // Amber
  low: "3B82F6",          // Blue
  info: "6B7280",         // Gray
  lightBg: "F8FAFC",      // Light gray background
  border: "E2E8F0",       // Border gray
};

const createTableRow = (cells: string[], isHeader = false, severity?: string) => {
  const headerColor = isHeader ? COLORS.primary : undefined;
  const cellBg = isHeader ? COLORS.primary : (severity ? getSeverityBg(severity) : undefined);
  
  return new TableRow({
    children: cells.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ 
          text: cell, 
          bold: isHeader,
          color: isHeader ? "FFFFFF" : (severity ? getSeverityColor(severity) : undefined),
          size: isHeader ? 24 : 22,
        })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 100, after: 100 },
      })],
      shading: cellBg ? { fill: cellBg } : undefined,
      margins: {
        top: 150,
        bottom: 150,
        left: 150,
        right: 150,
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
      },
    })),
  });
};

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical': return COLORS.critical;
    case 'high': return COLORS.high;
    case 'medium': return COLORS.medium;
    case 'low': return COLORS.low;
    default: return COLORS.info;
  }
};

const getSeverityBg = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical': return "FEE2E2";
    case 'high': return "FFEDD5";
    case 'medium': return "FEF3C7";
    case 'low': return "DBEAFE";
    default: return "F3F4F6";
  }
};

const createDetailTable = (title: string, content: string, color: string = COLORS.primary) => {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: title, bold: true, size: 24 })],
              spacing: { before: 100, after: 100 },
            })],
            shading: { fill: COLORS.lightBg },
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: content,
              spacing: { before: 100, after: 100 },
            })],
            width: { size: 75, type: WidthType.PERCENTAGE },
            margins: { top: 150, bottom: 150, left: 150, right: 150 },
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      }),
    ],
  });
};

export async function generateReport(data: ReportData): Promise<Blob> {
  const { assessment, findings, rawData } = data;
  
  // Extract functional levels from wherever they are in the data structure
  const extractFunctionalLevels = (data: any) => {
    // Try to find these values in various possible locations
    let forestLevel = "Unknown";
    let domainLevel = "Unknown";
    
    if (data?.ForestFunctionalLevel) {
      forestLevel = data.ForestFunctionalLevel;
    } else if (data?.DomainInfo?.ForestFunctionalLevel) {
      forestLevel = data.DomainInfo.ForestFunctionalLevel;
    } else if (data?.ForestMode) {
      forestLevel = data.ForestMode;
    } else if (data?.DomainInfo?.ForestMode) {
      forestLevel = data.DomainInfo.ForestMode;
    }
    
    if (data?.DomainFunctionalLevel) {
      domainLevel = data.DomainFunctionalLevel;
    } else if (data?.DomainInfo?.DomainFunctionalLevel) {
      domainLevel = data.DomainInfo.DomainFunctionalLevel;
    } else if (data?.DomainMode) {
      domainLevel = data.DomainMode;
    } else if (data?.DomainInfo?.DomainMode) {
      domainLevel = data.DomainInfo.DomainMode;
    }
    
    return { forestLevel, domainLevel };
  };
  
  const { forestLevel, domainLevel } = extractFunctionalLevels(rawData);
  
  const severityCounts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  };

  const criticalFindings = findings.filter(f => f.severity === 'critical');
  const highFindings = findings.filter(f => f.severity === 'high');
  const mediumFindings = findings.filter(f => f.severity === 'medium');
  const lowFindings = findings.filter(f => f.severity === 'low');

  const currentDate = new Date().toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const totalTests = findings.length;
  const overallHealth = severityCounts.critical > 0 ? "Critical" : 
                       severityCounts.high > 0 ? "Serious" : 
                       severityCounts.medium > 0 ? "Good" : "Excellent";

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: [
        // PORTADA MODERNA
        new Paragraph({
          children: [new TextRun({ 
            text: "Active Directory",
            size: 56,
            bold: true,
            color: COLORS.primary,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: "Risk Assessment Report",
            size: 48,
            color: COLORS.secondary,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: assessment.domain,
            size: 40,
            bold: true,
            color: COLORS.primary,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
        }),
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          alignment: AlignmentType.CENTER,
          borders: {
            top: { style: BorderStyle.NONE, size: 0 },
            bottom: { style: BorderStyle.NONE, size: 0 },
            left: { style: BorderStyle.NONE, size: 0 },
            right: { style: BorderStyle.NONE, size: 0 },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: "📅 Assessment Date", bold: true, size: 24 })],
                    alignment: AlignmentType.LEFT,
                  })],
                  shading: { fill: COLORS.lightBg },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0 },
                    bottom: { style: BorderStyle.NONE, size: 0 },
                    left: { style: BorderStyle.NONE, size: 0 },
                    right: { style: BorderStyle.NONE, size: 0 },
                  },
                  margins: { top: 100, bottom: 100, left: 200, right: 200 },
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: currentDate, size: 24 })],
                    alignment: AlignmentType.RIGHT,
                  })],
                  shading: { fill: COLORS.lightBg },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0 },
                    bottom: { style: BorderStyle.NONE, size: 0 },
                    left: { style: BorderStyle.NONE, size: 0 },
                    right: { style: BorderStyle.NONE, size: 0 },
                  },
                  margins: { top: 100, bottom: 100, left: 200, right: 200 },
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: "📊 Status", bold: true, size: 24 })],
                    alignment: AlignmentType.LEFT,
                  })],
                  shading: { fill: COLORS.lightBg },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0 },
                    bottom: { style: BorderStyle.NONE, size: 0 },
                    left: { style: BorderStyle.NONE, size: 0 },
                    right: { style: BorderStyle.NONE, size: 0 },
                  },
                  margins: { top: 100, bottom: 100, left: 200, right: 200 },
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ 
                      text: overallHealth, 
                      size: 24,
                      bold: true,
                      color: severityCounts.critical > 0 ? COLORS.critical : 
                             severityCounts.high > 0 ? COLORS.high : COLORS.accent
                    })],
                    alignment: AlignmentType.RIGHT,
                  })],
                  shading: { fill: COLORS.lightBg },
                  borders: {
                    top: { style: BorderStyle.NONE, size: 0 },
                    bottom: { style: BorderStyle.NONE, size: 0 },
                    left: { style: BorderStyle.NONE, size: 0 },
                    right: { style: BorderStyle.NONE, size: 0 },
                  },
                  margins: { top: 100, bottom: 100, left: 200, right: 200 },
                }),
              ],
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: "🔒 CONFIDENTIAL",
            bold: true,
            color: COLORS.critical,
            size: 28,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, after: 1200 },
        }),

        // AD FOREST AND DOMAIN SUMMARY
        new Paragraph({
          children: [new TextRun({ 
            text: "🌳 AD Forest and Domain Summary",
            size: 36,
            bold: true,
            color: COLORS.primary,
          })],
          spacing: { before: 600, after: 300 },
          border: {
            bottom: {
              color: COLORS.secondary,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        }),
        new Paragraph({
          text: "",
          spacing: { after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
            insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
          },
          rows: [
            createTableRow(["Property", "Value"], true),
            createTableRow(["AD Forest Name", rawData?.ForestName || rawData?.DomainInfo?.ForestName || assessment.domain]),
            createTableRow(["Forest Root Domain", rawData?.ForestRootDomain || rawData?.DomainInfo?.ForestRootDomain || assessment.domain]),
            createTableRow(["Forest Functional Level", forestLevel]),
            createTableRow(["Domain Functional Level", domainLevel]),
            createTableRow(["Domain Controllers", rawData?.DomainControllers?.length?.toString() || "N/A"]),
            createTableRow(["Number of AD Sites", rawData?.Sites?.length?.toString() || "1"]),
          ],
        }),

        // GROUP POLICY OBJECTS ANALYSIS
        ...(rawData?.GPOs && rawData.GPOs.length > 0 ? [
          new Paragraph({
            text: "Group Policy Objects Analysis",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: `A total of ${rawData.GPOs.length} Group Policy Objects were identified in the domain. The following section provides detailed information about each GPO, including its status, links, permissions, and recommended improvements.`,
            spacing: { after: 200 },
          }),
          
          // GPO Summary Table
          new Paragraph({
            text: "GPO Summary",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow(["GPO Name", "Status", "Links", "Last Modified"], true),
              ...rawData.GPOs.slice(0, 20).map((gpo: any) => {
                const displayName = gpo.DisplayName || gpo.Name || "N/A";
                const status = gpo.GpoStatus || "AllSettingsEnabled";
                const linksCount = gpo.Links?.length?.toString() || gpo.LinksCount?.toString() || "0";
                let lastModified = "N/A";
                
                if (gpo.ModificationTime) {
                  try {
                    const date = new Date(gpo.ModificationTime);
                    if (!isNaN(date.getTime())) {
                      lastModified = date.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      });
                    }
                  } catch (e) {
                    console.error('Error parsing date:', gpo.ModificationTime, e);
                  }
                }
                
                return createTableRow([displayName, status, linksCount, lastModified]);
              }),
            ],
          }),

          // GPO Status Analysis
          new Paragraph({
            text: "GPO Status Distribution",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            text: (() => {
              const statusCount = rawData.GPOs.reduce((acc: any, gpo: any) => {
                const status = gpo.GpoStatus || "Unknown";
                acc[status] = (acc[status] || 0) + 1;
                return acc;
              }, {});
              return `GPO Status: ${Object.entries(statusCount).map(([status, count]) => `${status}: ${count}`).join(", ")}`;
            })(),
            spacing: { after: 200 },
          }),

          // Recommendations for GPOs
          new Paragraph({
            text: "GPO Recommendations",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          }),
          new Paragraph({
            text: "Based on the GPO analysis, the following improvements are recommended:",
            spacing: { after: 100 },
          }),
          ...(() => {
            const recommendations = [];
            
            // Check for unlinked GPOs
            const unlinkedGPOs = rawData.GPOs.filter((gpo: any) => !gpo.Links || gpo.Links.length === 0);
            if (unlinkedGPOs.length > 0) {
              recommendations.push(
                new Paragraph({
                  text: `1. Unlinked GPOs: ${unlinkedGPOs.length} GPO(s) are not linked to any OU. Consider removing or linking these policies:`,
                  spacing: { before: 100, after: 50 },
                }),
                ...unlinkedGPOs.slice(0, 5).map((gpo: any) => 
                  new Paragraph({
                    text: `   • ${gpo.DisplayName}`,
                    spacing: { after: 50 },
                  })
                )
              );
            }

            // Check for disabled GPOs
            const disabledGPOs = rawData.GPOs.filter((gpo: any) => gpo.GpoStatus === "AllSettingsDisabled");
            if (disabledGPOs.length > 0) {
              recommendations.push(
                new Paragraph({
                  text: `2. Disabled GPOs: ${disabledGPOs.length} GPO(s) have all settings disabled. Review if these are still needed:`,
                  spacing: { before: 100, after: 50 },
                }),
                ...disabledGPOs.slice(0, 5).map((gpo: any) => 
                  new Paragraph({
                    text: `   • ${gpo.DisplayName}`,
                    spacing: { after: 50 },
                  })
                )
              );
            }

            // Check for old GPOs (not modified in 180+ days)
            const now = new Date();
            const oldGPOs = rawData.GPOs.filter((gpo: any) => {
              if (!gpo.ModificationTime) return false;
              const modDate = new Date(gpo.ModificationTime);
              const daysDiff = (now.getTime() - modDate.getTime()) / (1000 * 3600 * 24);
              return daysDiff > 180;
            });
            if (oldGPOs.length > 0) {
              recommendations.push(
                new Paragraph({
                  text: `3. Stale GPOs: ${oldGPOs.length} GPO(s) haven't been modified in over 180 days. Review if these are still relevant.`,
                  spacing: { before: 100, after: 50 },
                })
              );
            }

            // Check for GPOs with permission issues
            const gposWithAuthUsers = rawData.GPOs.filter((gpo: any) => 
              gpo.Permissions?.some((p: any) => p.Trustee === "Authenticated Users" && p.Permission !== "GpoApply")
            );
            if (gposWithAuthUsers.length > 0) {
              recommendations.push(
                new Paragraph({
                  text: `4. Permission Issues: ${gposWithAuthUsers.length} GPO(s) may have overly permissive access. Review permissions for:`,
                  spacing: { before: 100, after: 50 },
                }),
                ...gposWithAuthUsers.slice(0, 5).map((gpo: any) => 
                  new Paragraph({
                    text: `   • ${gpo.DisplayName}`,
                    spacing: { after: 50 },
                  })
                )
              );
            }

            // General recommendation
            recommendations.push(
              new Paragraph({
                text: "5. Best Practices: Ensure all GPOs follow naming conventions, have proper documentation, and are regularly reviewed for security compliance.",
                spacing: { before: 100, after: 100 },
              })
            );

            return recommendations.length > 0 ? recommendations : [
              new Paragraph({
                text: "No specific GPO improvements identified at this time. Continue monitoring GPO health regularly.",
                spacing: { after: 100 },
              })
            ];
          })(),
        ] : []),

        // EXECUTIVE SUMMARY
        new Paragraph({
          children: [new TextRun({ 
            text: "📋 Executive Summary",
            size: 36,
            bold: true,
            color: COLORS.primary,
          })],
          spacing: { before: 600, after: 300 },
          border: {
            bottom: {
              color: COLORS.secondary,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        }),
        new Paragraph({
          children: [new TextRun({ 
            text: `This report details issues that were discovered during the health and risk assessment of ${assessment.domain}.`,
            size: 24,
          })],
          spacing: { after: 400 },
        }),
        
        // Health Status Card
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 3, color: COLORS.secondary },
            bottom: { style: BorderStyle.SINGLE, size: 3, color: COLORS.secondary },
            left: { style: BorderStyle.SINGLE, size: 3, color: COLORS.secondary },
            right: { style: BorderStyle.SINGLE, size: 3, color: COLORS.secondary },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ 
                        text: "Overall Health Status",
                        bold: true,
                        size: 28,
                        color: COLORS.primary,
                      })],
                      spacing: { before: 200, after: 100 },
                    }),
                    new Paragraph({
                      children: [new TextRun({ 
                        text: overallHealth,
                        bold: true,
                        size: 48,
                        color: severityCounts.critical > 0 ? COLORS.critical : 
                               severityCounts.high > 0 ? COLORS.high : COLORS.accent
                      })],
                      spacing: { after: 200 },
                    }),
                  ],
                  shading: { fill: COLORS.lightBg },
                  margins: { top: 300, bottom: 300, left: 300, right: 300 },
                }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "", spacing: { after: 300 } }),

        // Test Summary Table with modern design
        new Paragraph({
          children: [new TextRun({ 
            text: "📊 Assessment Results",
            size: 28,
            bold: true,
            color: COLORS.primary,
          })],
          spacing: { before: 300, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            left: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            right: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
          },
          rows: [
            createTableRow(["Metric", "Count"], true),
            createTableRow(["Tests Completed Successfully", totalTests.toString()]),
            createTableRow(["🔴 Critical Issues Detected", severityCounts.critical.toString()], false, 'critical'),
            createTableRow(["🟠 High Severity Issues", severityCounts.high.toString()], false, 'high'),
            createTableRow(["🟡 Medium Severity Issues", severityCounts.medium.toString()], false, 'medium'),
            createTableRow(["🔵 Low Severity Issues", severityCounts.low.toString()], false, 'low'),
          ],
        }),

        // RISK ASSESSMENT SCORECARD
        new Paragraph({
          text: "Risk Assessment Scorecard",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: "This scorecard provides the overall risk score by category. This is determined by the highest risk score issue for each category.",
          spacing: { after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createTableRow(["Category", "Risk Severity"], true),
            createTableRow(["Active Directory and Forest", severityCounts.critical > 0 ? "Critical" : "No Issues Detected"]),
            createTableRow(["Domain Account Policies", severityCounts.high > 0 ? "Serious" : "No Issues Detected"]),
            createTableRow(["Domain Controller", severityCounts.medium > 0 ? "Moderate" : "No Issues Detected"]),
            createTableRow(["Security and Compliance", severityCounts.low > 0 ? "Low" : "No Issues Detected"]),
          ],
        }),

        // ISSUE LEVEL SUMMARY
        new Paragraph({
          text: "Issue Level Summary",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createTableRow(["Issue Details", "Risk Severity"], true),
            ...findings.map(f => createTableRow([f.title, f.severity.toUpperCase()])),
          ],
        }),

        // CRITICAL ISSUES
        ...(criticalFindings.length > 0 ? [
          new Paragraph({
            children: [new TextRun({ 
              text: "🔴 Critical Issues",
              size: 36,
              bold: true,
              color: COLORS.critical,
            })],
            spacing: { before: 600, after: 300 },
            border: {
              bottom: {
                color: COLORS.critical,
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: "The following critical issues require immediate attention and remediation.",
              size: 24,
              color: COLORS.critical,
            })],
            spacing: { after: 300 },
          }),
          ...criticalFindings.flatMap((finding, index) => [
            new Paragraph({
              children: [new TextRun({ 
                text: `${index + 1}. ${finding.title}`,
                size: 28,
                bold: true,
                color: COLORS.primary,
              })],
              spacing: { before: 400, after: 200 },
            }),
            createDetailTable("Description", finding.description, COLORS.critical),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            createDetailTable("Impact", "⚠️ This issue poses a critical security risk that should be addressed immediately. Exploitation could lead to complete system compromise.", COLORS.critical),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            createDetailTable("Recommendation", finding.recommendation, COLORS.critical),
            new Paragraph({ text: "", spacing: { after: 300 } }),
          ]),
        ] : []),

        // SERIOUS ISSUES (HIGH)
        ...(highFindings.length > 0 ? [
          new Paragraph({
            children: [new TextRun({ 
              text: "🟠 High Severity Issues",
              size: 36,
              bold: true,
              color: COLORS.high,
            })],
            spacing: { before: 600, after: 300 },
            border: {
              bottom: {
                color: COLORS.high,
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: "These high severity issues should be prioritized for remediation.",
              size: 24,
              color: COLORS.high,
            })],
            spacing: { after: 300 },
          }),
          ...highFindings.flatMap((finding, index) => [
            new Paragraph({
              children: [new TextRun({ 
                text: `${index + 1}. ${finding.title}`,
                size: 28,
                bold: true,
                color: COLORS.primary,
              })],
              spacing: { before: 400, after: 200 },
            }),
            createDetailTable("Description", finding.description, COLORS.high),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            createDetailTable("Impact", "⚠️ This serious issue should be addressed to maintain security posture and prevent potential attacks.", COLORS.high),
            new Paragraph({ text: "", spacing: { after: 100 } }),
            createDetailTable("Recommendation", finding.recommendation, COLORS.high),
            new Paragraph({ text: "", spacing: { after: 300 } }),
          ]),
        ] : []),

        // MODERATE ISSUES (MEDIUM)
        ...(mediumFindings.length > 0 ? [
          new Paragraph({
            children: [new TextRun({ 
              text: "🟡 Medium Severity Issues",
              size: 36,
              bold: true,
              color: COLORS.medium,
            })],
            spacing: { before: 600, after: 300 },
            border: {
              bottom: {
                color: COLORS.medium,
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
          new Paragraph({
            children: [new TextRun({ 
              text: "These moderate issues should be addressed as part of regular security maintenance.",
              size: 24,
              color: COLORS.medium,
            })],
            spacing: { after: 300 },
          }),
          new Paragraph({
            text: "The table below is a list of moderate issues that were detected as part of the Active Directory assessment.",
            spacing: { after: 200 },
          }),
          ...mediumFindings.flatMap((finding) => [
            new Paragraph({
              text: finding.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 100 },
            }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })],
                      shading: { fill: "D3D3D3" },
                      width: { size: 20, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                      children: [new Paragraph(finding.description)],
                      width: { size: 80, type: WidthType.PERCENTAGE },
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Impact", bold: true })] })],
                      shading: { fill: "D3D3D3" },
                    }),
                    new TableCell({
                      children: [new Paragraph("This moderate issue should be reviewed and addressed during regular maintenance.")],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Recommendation", bold: true })] })],
                      shading: { fill: "D3D3D3" },
                    }),
                    new TableCell({
                      children: [new Paragraph(finding.recommendation)],
                    }),
                  ],
                }),
              ],
            }),
          ]),
        ] : []),

        // CONCLUSIONS
        new Paragraph({
          text: "Conclusions and Next Steps",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: `The assessment of ${assessment.domain} has identified ${findings.length} findings that require attention. It is recommended to prioritize remediation of critical and serious issues within the next 30 days.`,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "Regular assessments should be performed every 6 months to maintain an adequate security posture.",
          spacing: { after: 200 },
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
}
