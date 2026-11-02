Attribute VB_Name = "ReportRefresh"
Option Explicit

Const SUMMARY_URL As String = "https://matrixtsl.dev/api/reports/export"
Const DETAIL_URL As String = "https://matrixtsl.dev/api/reports/export/detail"

' Canonical Summary columns — must match the server export order exactly.
Private Function SummaryHeaders() As Variant
    SummaryHeaders = Array("Report ID", "Date", "Submitted At", "Operator", "Product", _
        "Serial Number", "Build Reference", "Procedure", "Overall Result", _
        "Total Steps", "Steps Passed", "Steps Failed", "Comments", _
        "Started At", "Duration (min)", "Device ID", "IP Address", "User Agent", _
        "Attempt", "Steps Not Tested")
End Function

Function FetchURL(url As String) As String
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open "GET", url, False
    http.Send
    FetchURL = http.ResponseText
End Function

Function ParseCSVField(line As String, ByRef pos As Long) As String
    Dim result As String
    result = ""
    If pos > Len(line) Then ParseCSVField = "": Exit Function
    If Mid(line, pos, 1) = Chr(34) Then
        pos = pos + 1
        Do While pos <= Len(line)
            Dim ch As String
            ch = Mid(line, pos, 1)
            If ch = Chr(34) Then
                If pos + 1 <= Len(line) And Mid(line, pos + 1, 1) = Chr(34) Then
                    result = result & Chr(34): pos = pos + 2
                Else
                    pos = pos + 1: Exit Do
                End If
            Else
                result = result & ch: pos = pos + 1
            End If
        Loop
        If pos <= Len(line) And Mid(line, pos, 1) = "," Then pos = pos + 1
    Else
        Do While pos <= Len(line)
            Dim c As String
            c = Mid(line, pos, 1)
            If c = "," Then pos = pos + 1: Exit Do
            result = result & c: pos = pos + 1
        Loop
    End If
    ParseCSVField = result
End Function

Function ParseCSVLine(line As String) As String()
    Dim fields() As String
    ReDim fields(0)
    Dim count As Long: count = 0
    Dim pos As Long: pos = 1
    Do
        ReDim Preserve fields(count)
        fields(count) = ParseCSVField(line, pos)
        count = count + 1
        If pos > Len(line) Then Exit Do
    Loop
    ParseCSVLine = fields
End Function

Function ParseCSV(csvText As String) As Variant
    csvText = Replace(Replace(csvText, vbCrLf, vbLf), vbCr, vbLf)
    Dim lines() As String
    lines = Split(csvText, vbLf)
    Dim valid() As String
    Dim vCount As Long: vCount = 0
    Dim i As Long
    For i = 0 To UBound(lines)
        If Trim(lines(i)) <> "" Then
            ReDim Preserve valid(vCount)
            valid(vCount) = lines(i)
            vCount = vCount + 1
        End If
    Next i
    If vCount = 0 Then Exit Function
    Dim result() As Variant
    ReDim result(0 To vCount - 1)
    For i = 0 To vCount - 1
        result(i) = ParseCSVLine(valid(i))
    Next i
    ParseCSV = result
End Function

Function FindCol(headers() As String, name As String) As Long
    Dim i As Long
    For i = 0 To UBound(headers)
        If headers(i) = name Then FindCol = i: Exit Function
    Next i
    FindCol = -1
End Function

Function SafeName(s As String) As String
    Dim r As String: r = s
    r = Replace(r, Chr(47), "-")
    r = Replace(r, Chr(92), "-")
    r = Replace(r, Chr(63), "-")
    r = Replace(r, Chr(42), "-")
    r = Replace(r, Chr(91), "-")
    r = Replace(r, Chr(93), "-")
    r = Replace(r, Chr(58), "-")
    SafeName = Left(r, 31)
End Function

Function GetSheet(nm As String, addAfter As Boolean) As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(nm)
    On Error GoTo 0
    If ws Is Nothing Then
        If addAfter Then
            Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.count))
        Else
            Set ws = ThisWorkbook.Sheets.Add(Before:=ThisWorkbook.Sheets(1))
        End If
        ws.name = nm
    Else
        ws.Cells.Clear
        ws.Cells.FormatConditions.Delete
    End If
    Set GetSheet = ws
End Function

' Map a procedure code to its short product name (used when a report tab
' predates product storage and must be reconstructed from the tab alone).
Private Function ProductForProcedure(proc As String) As String
    Select Case UCase(Trim(proc))
        Case "IM0004": ProductForProcedure = "Closed Loop"
        Case "IM3214": ProductForProcedure = "LOGO!"
        Case "IM6930": ProductForProcedure = "Fundamentals"
        Case Else: ProductForProcedure = ""
    End Select
End Function

' Rebuild a 20-column Summary row from a single report tab. Used to self-heal
' the Summary when the server buffer has been reset but the tab still exists.
' Fields the tab does not store (Submitted At, Build Reference, report-level
' Comments) come back empty; step counts are derived from the step rows.
Private Function RowFromTab(ws As Worksheet, rid As String) As Variant
    Dim a(0 To 19) As Variant
    Dim i As Long
    For i = 0 To 19: a(i) = "": Next i

    a(0) = rid                                  ' Report ID   (B1)
    a(1) = ws.Cells(1, 4).value                 ' Date        (D1)
    a(2) = ""                                    ' Submitted At (not on tab)
    a(3) = ws.Cells(2, 2).value                 ' Operator    (B2)
    Dim proc As String: proc = CStr(ws.Cells(1, 6).value)   ' Procedure (F1)
    a(7) = proc
    a(4) = ProductForProcedure(proc)            ' Product (derived from procedure)
    a(5) = ws.Cells(2, 4).value                 ' Serial Number (D2)
    a(6) = ""                                    ' Build Reference (not on tab)
    a(8) = ws.Cells(2, 6).value                 ' Overall Result (F2)

    Dim total As Long, passed As Long, failed As Long, notTested As Long
    Dim lastRow As Long: lastRow = ws.Cells(ws.rows.count, 1).End(xlUp).Row
    Dim r As Long
    For r = 5 To lastRow
        Dim res As String: res = UCase(Trim(CStr(ws.Cells(r, 3).value)))
        If res = "PASS" Or res = "FAIL" Or res = "N/A" Or res = "NA" Or res = "NOT TESTED" Then
            total = total + 1
            If res = "NOT TESTED" Then notTested = notTested + 1
            If res = "PASS" Then passed = passed + 1
            If res = "FAIL" Then failed = failed + 1
        End If
    Next r
    a(9) = total
    a(10) = passed
    a(11) = failed
    a(12) = ""                                   ' Comments (report-level, not on tab)
    a(19) = notTested
    RowFromTab = a
End Function

Sub RefreshSummary()
    Const NCOL As Long = 20
    Dim hdr As Variant: hdr = SummaryHeaders()

    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")
    dict.CompareMode = 1   ' TextCompare

    Dim ws As Worksheet
    Dim r As Long, c As Long

    ' 1) Preserve rows already on the Summary sheet — the server may no longer
    '    have them (e.g. a Railway redeploy wiped reports.json).
    Set ws = Nothing
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Summary")
    On Error GoTo 0
    If Not ws Is Nothing Then
        Dim lastRow As Long
        lastRow = ws.Cells(ws.rows.count, 1).End(xlUp).Row
        For r = 4 To lastRow                    ' row 3 = headers, data from row 4
            Dim key As String: key = Trim(CStr(ws.Cells(r, 1).value))
            If key <> "" Then
                Dim rowArr(0 To NCOL - 1) As Variant
                For c = 0 To NCOL - 1
                    rowArr(c) = ws.Cells(r, c + 1).value
                Next c
                dict(key) = rowArr
            End If
        Next r
    End If

    ' 2) Overlay authoritative rows from the server (server wins on conflicts).
    Dim rows As Variant
    rows = ParseCSV(FetchURL(SUMMARY_URL))
    If Not IsEmpty(rows) Then
        If UBound(rows) >= 1 Then
            For r = 1 To UBound(rows)
                Dim sd() As String: sd = rows(r)
                Dim srowArr(0 To NCOL - 1) As Variant
                For c = 0 To NCOL - 1
                    If c <= UBound(sd) Then srowArr(c) = sd(c) Else srowArr(c) = ""
                Next c
                Dim skey As String: skey = Trim(srowArr(0))
                If skey <> "" Then dict(skey) = srowArr
            Next r
        End If
    End If

    ' 3) Self-heal: any report tab with no row yet gets one built from the tab.
    For Each ws In ThisWorkbook.Worksheets
        If ws.name <> "Summary" Then
            Dim tid As String: tid = Trim(CStr(ws.Cells(1, 2).value))   ' B1 = Report ID
            If tid = "" Then tid = ws.name
            If Not dict.Exists(tid) Then dict(tid) = RowFromTab(ws, tid)
        End If
    Next ws

    ' --- Rewrite the Summary sheet from the merged set ---
    Set ws = Nothing
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("Summary")
    On Error GoTo 0
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(Before:=ThisWorkbook.Sheets(1))
        ws.name = "Summary"
    Else
        ws.Cells.Clear
        ws.Cells.FormatConditions.Delete
    End If
    ws.Move Before:=ThisWorkbook.Sheets(1)

    ws.rows("1:2").RowHeight = 20
    ws.Cells(1, 1).value = "IM Test Reports"
    With ws.Range("A1:T1")
        .Merge
        .Font.bold = True: .Font.Size = 13
        .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(11, 29, 53)
        .VerticalAlignment = xlVAlignCenter
    End With

    For c = 0 To NCOL - 1
        ws.Cells(3, c + 1).value = hdr(c)
    Next c
    With ws.rows(3)
        .Font.bold = True: .Font.Color = RGB(255, 255, 255)
        .Interior.Color = RGB(30, 58, 95)
    End With

    Dim outRow As Long: outRow = 4
    Dim k As Variant
    For Each k In dict.Keys
        Dim vArr As Variant: vArr = dict(k)
        For c = 0 To NCOL - 1
            ws.Cells(outRow, c + 1).value = vArr(c)
        Next c
        outRow = outRow + 1
    Next k

    ' Colour-code the Overall Result column (col 9).
    If outRow > 4 Then
        Dim rng As Range
        Set rng = ws.Range(ws.Cells(4, 9), ws.Cells(outRow - 1, 9))
        rng.FormatConditions.Delete
        Dim fc As FormatCondition
        Set fc = rng.FormatConditions.Add(xlCellValue, xlEqual, "PASS")
        fc.Interior.Color = RGB(236, 253, 245): fc.Font.Color = RGB(16, 185, 129): fc.Font.bold = True
        Set fc = rng.FormatConditions.Add(xlCellValue, xlEqual, "FAIL")
        fc.Interior.Color = RGB(254, 242, 242): fc.Font.Color = RGB(239, 68, 68): fc.Font.bold = True
    End If

    ws.Columns.AutoFit
    ' Keep long text columns (Comments, Device ID, User Agent) from stretching the sheet.
    For c = 1 To NCOL
        If ws.Columns(c).ColumnWidth > 40 Then ws.Columns(c).ColumnWidth = 40
    Next c
    ws.rows(2).RowHeight = 4
End Sub

Private Function DurationText(rd() As String, col As Long) As String
    Dim m As Double
    If col < 0 Then Exit Function
    If col > UBound(rd) Then Exit Function
    If Len(rd(col)) = 0 Then Exit Function
    m = Val(rd(col))
    If m >= 60 Then
        DurationText = Int(m / 60) & "h " & Format(Round(m - Int(m / 60) * 60, 0), "00") & "m"
    Else
        DurationText = Format(m, "0.0") & " min"
    End If
End Function

Private Function AttemptText(rd() As String, col As Long) As String
    If col < 0 Then Exit Function
    If col > UBound(rd) Then Exit Function
    AttemptText = rd(col)
End Function

Sub RefreshDetailTabs()
    Dim rows As Variant
    rows = ParseCSV(FetchURL(DETAIL_URL))
    If IsEmpty(rows) Then Exit Sub
    If UBound(rows) < 1 Then Exit Sub

    Dim headers() As String: headers = rows(0)
    Dim cRID  As Long: cRID = FindCol(headers, "Report ID")
    Dim cDt   As Long: cDt = FindCol(headers, "Date")
    Dim cOp   As Long: cOp = FindCol(headers, "Operator")
    Dim cSN   As Long: cSN = FindCol(headers, "Serial Number")
    Dim cProc As Long: cProc = FindCol(headers, "Procedure")
    Dim cOvr  As Long: cOvr = FindCol(headers, "Overall Result")
    Dim cSec  As Long: cSec = FindCol(headers, "Section")
    Dim cStep As Long: cStep = FindCol(headers, "Step")
    Dim cCrit As Long: cCrit = FindCol(headers, "Criteria")
    Dim cRes  As Long: cRes = FindCol(headers, "Result")
    Dim cCmt  As Long: cCmt = FindCol(headers, "Comments")
    Dim cSig  As Long: cSig = FindCol(headers, "Sign Off")
    Dim cDur  As Long: cDur = FindCol(headers, "Duration (min)")
    Dim cAtt  As Long: cAtt = FindCol(headers, "Attempt")

    Dim rids() As String
    ReDim rids(0)
    Dim ridCount As Long: ridCount = 0
    Dim r As Long
    For r = 1 To UBound(rows)
        Dim rd() As String: rd = rows(r)
        Dim rid As String: rid = rd(cRID)
        Dim found As Boolean: found = False
        Dim k As Long
        For k = 0 To ridCount - 1
            If rids(k) = rid Then found = True: Exit For
        Next k
        If Not found Then
            ReDim Preserve rids(ridCount)
            rids(ridCount) = rid: ridCount = ridCount + 1
        End If
    Next r

    For k = 0 To ridCount - 1
        Dim ws As Worksheet
        Set ws = GetSheet(SafeName(rids(k)), True)

        Dim firstRd() As String
        Dim hasFirst As Boolean: hasFirst = False
        For r = 1 To UBound(rows)
            rd = rows(r)
            If rd(cRID) = rids(k) Then firstRd = rd: hasFirst = True: Exit For
        Next r
        If Not hasFirst Then GoTo NextTab

        With ws
            .Cells(1, 1).value = "Report ID": .Cells(1, 2).value = firstRd(cRID)
            .Cells(1, 3).value = "Date": .Cells(1, 4).value = firstRd(cDt)
            .Cells(1, 5).value = "Procedure": .Cells(1, 6).value = firstRd(cProc)
            .Cells(2, 1).value = "Operator": .Cells(2, 2).value = firstRd(cOp)
            .Cells(2, 3).value = "Serial Number": .Cells(2, 4).value = firstRd(cSN)
            .Cells(2, 5).value = "Overall Result": .Cells(2, 6).value = firstRd(cOvr)
            ' Test duration / attempt (blank for reports made before timing was added)
            .Cells(1, 7).value = "Test Duration": .Cells(1, 8).value = DurationText(firstRd, cDur)
            .Cells(2, 7).value = "Attempt": .Cells(2, 8).value = AttemptText(firstRd, cAtt)
            With .Range("A1:H2")
                .Font.bold = True: .Font.Color = RGB(255, 255, 255)
                .Interior.Color = RGB(11, 29, 53)
            End With
            If firstRd(cOvr) = "PASS" Then
                .Cells(2, 6).Interior.Color = RGB(16, 185, 129)
            ElseIf firstRd(cOvr) = "FAIL" Then
                .Cells(2, 6).Interior.Color = RGB(239, 68, 68)
            End If
            .Cells(4, 1).value = "Step": .Cells(4, 2).value = "Criteria"
            .Cells(4, 3).value = "Result": .Cells(4, 4).value = "Comments"
            .Cells(4, 5).value = "Sign Off"
            With .rows(4)
                .Font.bold = True: .Interior.Color = RGB(248, 250, 252)
            End With
        End With

        Dim writeRow As Long: writeRow = 5
        Dim curSec As String: curSec = ""
        For r = 1 To UBound(rows)
            rd = rows(r)
            If rd(cRID) = rids(k) Then
                If rd(cSec) <> curSec Then
                    curSec = rd(cSec)
                    With ws.Range(ws.Cells(writeRow, 1), ws.Cells(writeRow, 5))
                        .Merge: .value = curSec
                        .Font.bold = True
                        .Interior.Color = RGB(240, 244, 249)
                    End With
                    writeRow = writeRow + 1
                End If
                ws.Cells(writeRow, 1).NumberFormat = "@"    ' keep "4.10" from becoming 4.1
                ws.Cells(writeRow, 1).value = rd(cStep)
                ws.Cells(writeRow, 2).value = rd(cCrit)
                ws.Cells(writeRow, 3).value = rd(cRes)
                ws.Cells(writeRow, 4).value = rd(cCmt)
                ws.Cells(writeRow, 5).value = rd(cSig)
                Select Case rd(cRes)
                    Case "PASS"
                        ws.Cells(writeRow, 3).Interior.Color = RGB(236, 253, 245)
                        ws.Cells(writeRow, 3).Font.Color = RGB(16, 185, 129)
                    Case "FAIL"
                        ws.Cells(writeRow, 3).Interior.Color = RGB(254, 242, 242)
                        ws.Cells(writeRow, 3).Font.Color = RGB(239, 68, 68)
                    Case "NOT TESTED"
                        ws.Cells(writeRow, 3).Interior.Color = RGB(243, 244, 246)
                        ws.Cells(writeRow, 3).Font.Color = RGB(107, 114, 128)
                End Select
                writeRow = writeRow + 1
            End If
        Next r

        ws.Columns.AutoFit
        ws.Columns(2).ColumnWidth = 55
NextTab:
    Next k
End Sub

Sub RefreshAllReports()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    On Error GoTo ErrH
    RefreshDetailTabs
    RefreshSummary
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    MsgBox "Reports refreshed! " & (ThisWorkbook.Sheets.count - 1) & " report tab(s) loaded.", vbInformation, "IM Test Reports"
    Exit Sub
ErrH:
    Application.ScreenUpdating = True
    Application.Calculation = xlCalculationAutomatic
    MsgBox "Error " & Err.Number & ": " & Err.Description, vbCritical, "IM Test Reports"
End Sub


