Attribute VB_Name = "ReportPdf"
Option Explicit

' Export IM test report tabs from "IM Test Reports.xlsm" to PDF.
'
'   ExportReportPdf     - exports ONE report. Works from either:
'                         * a report tab (exports that tab), or
'                         * the Summary sheet (exports the report on the selected row).
'   ExportAllReportsPdf - exports every report tab, one PDF each.
'   AddPdfButton        - run once; puts an "Export PDF" button on the Summary sheet.
'
' PDFs are saved in a "PDFs" folder next to the workbook. If the workbook is
' open from a web (SharePoint/OneDrive) address, they go to
' Documents\IM Test Report PDFs instead.

Private Const SUMMARY_SHEET As String = "Summary"
Private Const SUMMARY_HEADER_ROW As Long = 3

Public Sub ExportReportPdf()
    Dim ws As Worksheet, rid As String, outPath As String

    If ActiveSheet.Name = SUMMARY_SHEET Then
        If ActiveCell.Row <= SUMMARY_HEADER_ROW Then
            MsgBox "Click a report row on the Summary sheet (or open a report tab), then try again.", vbInformation, "Export PDF"
            Exit Sub
        End If
        rid = Trim$(CStr(Cells(ActiveCell.Row, 1).Value))
        If Len(rid) = 0 Then
            MsgBox "No Report ID on that row.", vbInformation, "Export PDF"
            Exit Sub
        End If
        Set ws = FindReportSheet(rid)
        If ws Is Nothing Then
            MsgBox "No tab found for report '" & rid & "'. Click Refresh Reports first.", vbExclamation, "Export PDF"
            Exit Sub
        End If
    Else
        Set ws = ActiveSheet
    End If

    outPath = ExportSheet(ws)
    If Len(outPath) > 0 Then
        MsgBox "Saved: " & outPath, vbInformation, "Export PDF"
        ThisWorkbook.FollowHyperlink outPath
    End If
End Sub

Public Sub ExportAllReportsPdf()
    Dim ws As Worksheet, n As Long
    Application.ScreenUpdating = False
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> SUMMARY_SHEET Then
            If Len(ExportSheet(ws)) > 0 Then n = n + 1
        End If
    Next ws
    Application.ScreenUpdating = True
    MsgBox n & " PDF(s) saved to:" & vbCrLf & OutputFolder(), vbInformation, "Export PDF"
End Sub

Public Sub AddPdfButton()
    Dim ws As Worksheet, shp As Shape, anchor As Range
    Set ws = ThisWorkbook.Worksheets(SUMMARY_SHEET)
    For Each shp In ws.Shapes
        If shp.Name = "btnExportPdf" Then shp.Delete
    Next shp
    ' Sit to the right of the Refresh Reports button (cols A-C).
    Set anchor = ws.Range("D2:F3")
    Set shp = ws.Shapes.AddFormControl(0, anchor.Left + 6, anchor.Top + 2, anchor.Width - 12, anchor.Height - 4)
    shp.Name = "btnExportPdf"
    shp.OnAction = "ReportPdf.ExportReportPdf"
    shp.TextFrame.Characters.Text = "Export PDF"
End Sub

' ---------------------------------------------------------------------------

Private Function ExportSheet(ws As Worksheet) As String
    Dim lastRow As Long, lastCol As Long, folder As String, f As String

    lastRow = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious).Row
    lastCol = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious).Column

    On Error GoTo fail
    With ws.PageSetup
        .PrintArea = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol)).Address
        .PrintTitleRows = "$4:$4"          ' repeat Step / Criteria / Result header
        .Orientation = xlPortrait
        .PaperSize = xlPaperA4
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = False
        .LeftMargin = Application.CentimetersToPoints(1.5)
        .RightMargin = Application.CentimetersToPoints(1.5)
        .TopMargin = Application.CentimetersToPoints(1.8)
        .BottomMargin = Application.CentimetersToPoints(1.8)
        .CenterHorizontally = True
        .CenterFooter = "&A  -  Page &P of &N"
    End With
    ws.Rows.AutoFit

    folder = OutputFolder()
    If Len(Dir(folder, vbDirectory)) = 0 Then MkDir folder
    f = folder & "\" & ws.Name & ".pdf"

    ws.ExportAsFixedFormat Type:=xlTypePDF, Filename:=f, Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, IgnorePrintAreas:=False, OpenAfterPublish:=False
    ExportSheet = f
    Exit Function
fail:
    MsgBox "Could not export '" & ws.Name & "': " & Err.Description, vbExclamation, "Export PDF"
End Function

Private Function OutputFolder() As String
    Dim base As String
    base = ThisWorkbook.Path
    If Len(base) = 0 Or LCase$(Left$(base, 4)) = "http" Then
        base = Environ$("USERPROFILE") & "\Documents"
        OutputFolder = base & "\IM Test Report PDFs"
    Else
        OutputFolder = base & "\PDFs"
    End If
End Function

Private Function FindReportSheet(rid As String) As Worksheet
    Dim nm As String, ws As Worksheet
    nm = rid
    nm = Replace(nm, "/", "")
    nm = Replace(nm, "\", "")
    nm = Replace(nm, "?", "")
    nm = Replace(nm, "*", "")
    nm = Replace(nm, "[", "")
    nm = Replace(nm, "]", "")
    nm = Replace(nm, ":", "")
    nm = Left$(nm, 31)
    For Each ws In ThisWorkbook.Worksheets
        If StrComp(ws.Name, nm, vbTextCompare) = 0 Then
            Set FindReportSheet = ws
            Exit Function
        End If
    Next ws
End Function
