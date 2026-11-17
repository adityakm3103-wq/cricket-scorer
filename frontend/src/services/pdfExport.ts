import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { matchApi } from './api.js';

export async function generateAndDownloadMatchPdf(matchId: string) {
  const res = await matchApi.getMatch(matchId);
  const match = res.data;
  if (!match) throw new Error('Match not found');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('CRICKET MATCH SCORECARD', 105, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(51, 65, 85);
  doc.text(`${match.teamA.teamName} vs ${match.teamB.teamName}`, 105, 26, { align: 'center' });

  const matchDateStr = format(new Date(match.matchDate), 'dd MMMM yyyy');
  const venueStr = match.venue ? ` | Venue: ${match.venue}` : '';
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Format: ${match.format} | Date: ${matchDateStr}${venueStr}`, 105, 32, { align: 'center' });

  // Result & Toss Summary Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 36, 182, 16, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(match.resultDescription || `Status: ${match.status}`, 18, 42);

  const tossText = match.tossWinnerId
    ? `Toss: ${match.tossWinnerId === match.teamAId ? match.teamA.teamName : match.teamB.teamName} won the toss and elected to ${match.tossDecision?.toLowerCase()}`
    : 'Toss: Not conducted';
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(tossText, 18, 48);

  let currentY = 58;

  // Innings Loop
  for (const inn of match.innings || []) {
    const battingTeam = inn.battingTeamId === match.teamAId ? match.teamA : match.teamB;

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Innings ${inn.inningsNumber} - ${battingTeam.teamName} (${inn.totalRuns}/${inn.wickets} in ${inn.oversCompletedText} ov)${inn.isDeclared ? ' [Declared]' : ''}`,
      14,
      currentY
    );
    currentY += 4;

    // Batting Table
    const battingRows = (inn.battingScorecards || []).map((b: any) => [
      `${b.player?.playerName || 'Player'}${b.notOut ? '*' : ''} (#${b.player?.jerseyNumber || ''})`,
      b.notOut ? 'not out' : (b.dismissalText || b.dismissalType || 'out'),
      b.runs.toString(),
      b.balls.toString(),
      b.fours.toString(),
      b.sixes.toString(),
      Number(b.strikeRate || 0).toFixed(1),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Batter', 'Dismissal', 'R', 'B', '4s', '6s', 'SR']],
      body: battingRows,
      theme: 'grid',
      headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 60 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 16, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Extras & Total line
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const extrasTotal = (inn.byes || 0) + (inn.legByes || 0) + (inn.wides || 0) + (inn.noBalls || 0) + (inn.penaltyRuns || 0);
    doc.text(
      `Extras: ${extrasTotal} (b ${inn.byes || 0}, lb ${inn.legByes || 0}, w ${inn.wides || 0}, nb ${inn.noBalls || 0})   |   Total: ${inn.totalRuns}/${inn.wickets} (${inn.oversCompletedText} Overs)`,
      14,
      currentY
    );
    currentY += 6;

    // Bowling Table
    const bowlingRows = (inn.bowlingScorecards || []).map((bw: any) => [
      `${bw.player?.playerName || 'Player'} (#${bw.player?.jerseyNumber || ''})`,
      bw.oversText || '0.0',
      bw.maidens.toString(),
      bw.runsConceded.toString(),
      bw.wickets.toString(),
      Number(bw.economy || 0).toFixed(1),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Bowler', 'O', 'M', 'R', 'W', 'Econ']],
      body: bowlingRows,
      theme: 'grid',
      headStyles: { fillColor: [226, 232, 240], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.save(`match_${match.id.substring(0, 8)}_scorecard.pdf`);
}
