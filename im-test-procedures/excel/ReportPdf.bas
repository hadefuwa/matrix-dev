Attribute VB_Name = "ReportPdf"
Option Explicit

' Export IM test report tabs from "IM Test Reports.xlsm" to PDF.
' Each PDF has a certificate-style cover page followed by the full step-by-step report.
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
'
' Report tab layout assumed: row 1 = Report ID | id | Date | date | Procedure | proc,
' row 2 = Operator | name | Serial Number | sn | Overall Result | PASS/FAIL,
' row 4 = Step header, steps from row 5 (Result in column C).

Private Const SUMMARY_SHEET As String = "Summary"
Private Const SUMMARY_HEADER_ROW As Long = 3
Private Const COVER_SHEET As String = "_Cover"

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
    Dim ws As Worksheet, n As Long, names As Collection, v As Variant
    Set names = New Collection
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> SUMMARY_SHEET And ws.Name <> COVER_SHEET Then names.Add ws.Name
    Next ws
    For Each v In names
        If Len(ExportSheet(ThisWorkbook.Worksheets(CStr(v)))) > 0 Then n = n + 1
    Next v
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
    Dim cv As Worksheet, prevScreen As Boolean, prevAlerts As Boolean

    prevScreen = Application.ScreenUpdating
    prevAlerts = Application.DisplayAlerts

    lastRow = ws.Cells.Find("*", SearchOrder:=xlByRows, SearchDirection:=xlPrevious).Row
    lastCol = ws.Cells.Find("*", SearchOrder:=xlByColumns, SearchDirection:=xlPrevious).Column

    On Error GoTo fail
    Application.ScreenUpdating = False
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

    Set cv = BuildCover(ws)
    ThisWorkbook.Sheets(Array(cv.Name, ws.Name)).Select
    ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, Filename:=f, Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, IgnorePrintAreas:=False, OpenAfterPublish:=False
    ExportSheet = f

cleanup:
    On Error Resume Next
    ws.Select
    Application.DisplayAlerts = False
    ThisWorkbook.Worksheets(COVER_SHEET).Delete
    Application.DisplayAlerts = prevAlerts
    Application.ScreenUpdating = prevScreen
    Exit Function
fail:
    MsgBox "Could not export '" & ws.Name & "': " & Err.Description, vbExclamation, "Export PDF"
    Resume cleanup
End Function

' Builds a temporary certificate-style cover sheet from the report tab's header and results.
Private Function BuildCover(src As Worksheet) As Worksheet
    Dim cv As Worksheet, sm As Worksheet, r As Variant, i As Long, lastRow As Long
    Dim rid As String, proc As String, op As String, sn As String, res As String
    Dim prod As String, build As String, dt As String
    Dim nPass As Long, nFail As Long, nNA As Long, v As String
    Dim ok As Boolean, clr As Long, navy As Long, grey As Long, lite As Long

    navy = RGB(31, 56, 100): grey = RGB(100, 100, 100): lite = RGB(242, 242, 242)

    rid = CStr(src.Range("B1").Value)
    If IsDate(src.Range("D1").Value) Then dt = Format$(src.Range("D1").Value, "dd mmm yyyy") Else dt = CStr(src.Range("D1").Value)
    proc = CStr(src.Range("F1").Value)
    op = CStr(src.Range("B2").Value)
    sn = CStr(src.Range("D2").Value)
    res = UCase$(Trim$(CStr(src.Range("F2").Value)))
    ok = (res = "PASS")

    ' Product / build reference only live on the Summary sheet.
    Set sm = ThisWorkbook.Worksheets(SUMMARY_SHEET)
    r = Application.Match(rid, sm.Columns(1), 0)
    If Not IsError(r) Then
        prod = CStr(sm.Cells(r, 5).Value)
        build = CStr(sm.Cells(r, 7).Value)
    End If

    lastRow = src.Cells(src.Rows.Count, 3).End(xlUp).Row
    For i = 5 To lastRow
        v = UCase$(Trim$(CStr(src.Cells(i, 3).Value)))
        If v = "PASS" Then
            nPass = nPass + 1
        ElseIf v = "FAIL" Then
            nFail = nFail + 1
        ElseIf v = "N/A" Then
            nNA = nNA + 1
        End If
    Next i

    Set cv = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
    cv.Name = COVER_SHEET
    cv.Cells.Font.Name = "Calibri"
    cv.Columns("A").ColumnWidth = 2
    cv.Columns("B:E").ColumnWidth = 22
    cv.Columns("F").ColumnWidth = 2
    cv.Rows("1:36").RowHeight = 18

    ' Header
    Banner cv, "B2:E2", "MATRIX TSL", 16, True, navy
    Banner cv, "B3:E3", "Industrial Maintenance  |  Production Test", 10, False, grey
    With cv.Range("B4:E4").Borders(xlEdgeBottom)
        .LineStyle = xlContinuous: .Weight = xlMedium: .Color = navy
    End With

    cv.Rows(6).RowHeight = 48
    Banner cv, "B6:E6", "TEST CERTIFICATE", 30, True, navy
    Banner cv, "B7:E7", "Electrical Test Procedure  " & ChrW(8211) & "  " & proc, 12, False, grey

    ' Statement
    cv.Rows("9:10").RowHeight = 24
    If ok Then
        Banner cv, "B9:E10", "This is to certify that the product identified below has been inspected and tested " & _
            "in accordance with the above procedure, and that all required test steps were completed satisfactorily.", 11, False, vbBlack
    Else
        Banner cv, "B9:E10", "The product identified below has been tested in accordance with the above procedure. " & _
            "One or more test steps FAILED. This product is NOT certified and must not be released.", 11, False, vbBlack
    End If
    cv.Range("B9:E10").WrapText = True
    cv.Range("B9:E10").VerticalAlignment = xlCenter

    ' Result stamp
    cv.Rows(12).RowHeight = 54
    If ok Then clr = RGB(46, 125, 50) Else clr = RGB(198, 40, 40)
    Banner cv, "C12:D12", IIf(ok, "PASS", "FAIL"), 36, True, vbWhite
    cv.Range("C12:D12").Interior.Color = clr

    ' Product details
    SectionHead cv, "B14:E14", "PRODUCT DETAILS", navy
    DetailRow cv, 15, "Report ID", rid, lite
    DetailRow cv, 16, "Product", prod, lite
    DetailRow cv, 17, "Serial Number", sn, lite
    DetailRow cv, 18, "Procedure", proc, lite
    DetailRow cv, 19, "Build Reference", build, lite
    DetailRow cv, 20, "Date of Test", dt, lite
    DetailRow cv, 21, "Tested By", op, lite

    ' Result counts
    SectionHead cv, "B23:E23", "TEST SUMMARY", navy
    cv.Range("B24").Value = "Total Steps": cv.Range("C24").Value = "Passed"
    cv.Range("D24").Value = "Failed": cv.Range("E24").Value = "N/A"
    cv.Range("B25").Value = nPass + nFail + nNA: cv.Range("C25").Value = nPass
    cv.Range("D25").Value = nFail: cv.Range("E25").Value = nNA
    With cv.Range("B24:E24")
        .Font.Size = 9: .Font.Color = grey: .HorizontalAlignment = xlCenter
    End With
    cv.Rows(25).RowHeight = 34
    With cv.Range("B25:E25")
        .Font.Size = 22: .Font.Bold = True: .HorizontalAlignment = xlCenter: .VerticalAlignment = xlCenter
        .Interior.Color = lite
    End With
    If nFail > 0 Then cv.Range("D25").Font.Color = RGB(198, 40, 40)

    ' Sign-off
    SectionHead cv, "B27:E27", "AUTHORISATION", navy
    cv.Rows(29).RowHeight = 36
    cv.Range("B29:C29").Borders(xlEdgeBottom).LineStyle = xlContinuous
    cv.Range("D29:E29").Borders(xlEdgeBottom).LineStyle = xlContinuous
    cv.Range("B30").Value = "Tested by: " & op
    cv.Range("D30").Value = "Approved by (signature):"
    cv.Range("B31").Value = "Date: " & dt
    cv.Range("D31").Value = "Date:"
    cv.Range("B30:E31").Font.Size = 10

    ' Footer note
    Banner cv, "B34:E34", "Report ID " & rid & "  |  Generated " & Format$(Date, "dd mmm yyyy") & _
        "  |  Full step-by-step results follow on the next page(s)", 8, False, grey
    cv.Range("B34").Font.Italic = True

    ' Double-line page frame
    With cv.Range("A1:F36")
        .BorderAround xlDouble, xlThick, , navy
    End With

    With cv.PageSetup
        .PrintArea = "$A$1:$F$36"
        .Orientation = xlPortrait
        .PaperSize = xlPaperA4
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .CenterHorizontally = True
        .CenterVertically = True
        .CenterFooter = ""
    End With

    Set BuildCover = cv
End Function

Private Sub Banner(ws As Worksheet, addr As String, txt As String, sz As Double, bold As Boolean, clr As Long)
    With ws.Range(addr)
        .Merge
        .Value = txt
        .Font.Size = sz
        .Font.Bold = bold
        .Font.Color = clr
        .HorizontalAlignment = xlCenter
        .VerticalAlignment = xlCenter
    End With
End Sub

Private Sub SectionHead(ws As Worksheet, addr As String, txt As String, navy As Long)
    With ws.Range(addr)
        .Merge
        .Value = txt
        .Font.Size = 10
        .Font.Bold = True
        .Font.Color = vbWhite
        .Interior.Color = navy
        .HorizontalAlignment = xlLeft
        .VerticalAlignment = xlCenter
        .IndentLevel = 1
    End With
End Sub

Private Sub DetailRow(ws As Worksheet, rw As Long, label As String, value As String, lite As Long)
    ws.Cells(rw, 2).Value = label
    ws.Cells(rw, 2).Font.Bold = True
    ws.Cells(rw, 2).Interior.Color = lite
    With ws.Range(ws.Cells(rw, 3), ws.Cells(rw, 5))
        .Merge
        .NumberFormat = "@"
        .Value = value
        .HorizontalAlignment = xlLeft
    End With
    ws.Range(ws.Cells(rw, 2), ws.Cells(rw, 5)).Borders(xlEdgeBottom).LineStyle = xlContinuous
    ws.Range(ws.Cells(rw, 2), ws.Cells(rw, 5)).Borders(xlEdgeBottom).Color = RGB(200, 200, 200)
    ws.Range(ws.Cells(rw, 2), ws.Cells(rw, 5)).VerticalAlignment = xlCenter
End Sub

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
