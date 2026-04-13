# 실습 환경 지침 (완전본)

> 이 파일은 실습이 끝난 후 강사가 나눠주는 **완성된 CLAUDE.md**입니다.
> 실습 중에 수강생이 하나씩 채워온 규칙들이 모두 포함되어 있습니다.
> 나중에 실무에서 Office 자동화를 할 때, 이 파일을 프로젝트 폴더에 복사해서 쓰세요.

## 환경 제약
- Python을 사용하지 마세요. 이 컴퓨터에 Python이 설치되어 있지 않습니다.
- Node.js를 사용하지 마세요. 설치되어 있지 않습니다.
- 모든 작업은 **PowerShell**로 수행하세요.
- Excel, PowerPoint, Word, Outlook 자동화는 **PowerShell + COM 객체**를 사용하세요.
- 웹 페이지(대시보드, QR 코드 등)는 **HTML/CSS/JavaScript**로 만드세요.
- **CDN(외부 라이브러리 링크) 사용 금지** — 사내망에서 외부 CDN 접근이 차단됩니다. Chart.js, D3.js 등 라이브러리가 필요하면 반드시 HTML 파일 안에 `<script>` 태그로 **소스코드 전체를 인라인으로 포함**하거나, 라이브러리 없이 SVG/Canvas로 직접 그리세요.
- 결과물은 "결과물" 폴더에 저장하세요.
- 날짜 형식: YYYY-MM-DD

## Excel 파일 읽기
- openpyxl, pandas 등 Python 라이브러리를 사용하지 마세요.
- PowerShell에서 Excel COM 객체로 읽으세요:
```powershell
$excel = New-Object -ComObject Excel.Application
$wb = $excel.Workbooks.Open("파일경로")
```

## 파일 처리
- 파일 이동, 복사, 이름 변경 등은 PowerShell 명령어를 사용하세요.
- Move-Item, Copy-Item, Rename-Item 등

## Word COM SaveAs 규칙 (필수)

PowerShell에서 Word COM의 `SaveAs()`는 파라미터 전달이 까다롭습니다.
`[ref]` 방식, `SaveAs2` 방식 모두 실패할 수 있습니다.

**반드시 아래 리플렉션 방식을 사용하세요:**
```powershell
# wdFormatXMLDocument = 12 (.docx)
[void]$doc.GetType().InvokeMember(
    'SaveAs',
    'InvokeMethod',
    $null,
    $doc,
    @($filePath, 12)
)
```
- 이 방식만 안정적으로 동작합니다.

## Excel/PPT COM 숫자 값 주의

Excel COM 셀에 숫자(Int, Double, Long)를 넣을 때 타입 캐스팅 에러가 발생할 수 있습니다.
```powershell
# 에러 발생할 수 있음:
$ws.Cells.Item($row, $col).Value2 = $someNumber

# 해결: 문자열로 변환
$ws.Cells.Item($row, $col).Value2 = [string]$someNumber
```

## 한국어 인코딩 처리 (핵심 — 반드시 준수)

### 문제 원인
이 환경은 Bash 셸 안에서 PowerShell을 호출하는 구조입니다. 두 가지 충돌이 발생합니다:
1. **Bash의 `$` 해석**: `powershell -Command "..."` 안에 `$_`, `$var` 등이 있으면 Bash가 먼저 해석하여 깨짐
2. **UTF-8 BOM 부재**: Claude Code의 Write 도구는 BOM 없는 UTF-8로 파일을 저장하므로, PowerShell이 한국어 경로를 읽을 때 깨질 수 있음

### 해결 패턴 (3단계 — 항상 이 순서를 따를 것)

**1단계: Write 도구로 .ps1 스크립트 파일 생성**
- `powershell -Command "..."` 인라인 실행은 절대 사용하지 말 것 (Bash가 `$` 변수를 먹음)
- 반드시 .ps1 파일로 먼저 작성

**2단계: BOM 추가**
- `.ps1` 파일을 저장한 후 아래 명령어로 BOM을 추가:
```bash
printf 'param([string]$p)\n$c = Get-Content -Path $p -Raw -Encoding UTF8\n$e = New-Object System.Text.UTF8Encoding($true)\n[System.IO.File]::WriteAllText($p, $c, $e)' > /tmp/_addbom.ps1 && powershell -ExecutionPolicy Bypass -File /tmp/_addbom.ps1 -p "대상파일.ps1"
```
- 이 단계를 건너뛰면 한국어 경로가 깨짐
- **참고**: Hook을 설정하면 이 단계가 자동화됩니다 (아래 Hook 섹션 참조)

**3단계: powershell -File로 실행**
```bash
powershell -ExecutionPolicy Bypass -File "스크립트.ps1"
```
- `-Command`가 아닌 **`-File`** 을 사용해야 Bash의 `$` 해석을 회피

### 추가 규칙
- 스크립트 첫 줄에 반드시 `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` 포함
- 파일 목록 조회, 이름 변경 등은 PowerShell(`Get-ChildItem`, `Rename-Item` 등) 사용. Bash의 `ls`는 한국어가 깨질 수 있음
- 파일 내용 읽기/쓰기 시 `-Encoding UTF8` 옵션 사용
- 짧은 1줄 명령(인자 없는 단순 cmdlet)만 `powershell -Command`로 허용

## Git 버전관리 규칙

### 커밋 타이밍
- Excel, PowerPoint, Word 파일을 **수정하기 전에** 반드시 현재 상태를 커밋할 것
- 수정 완료 후에도 결과를 커밋할 것
- 즉, 수정 전 1회 + 수정 후 1회 = 최소 2회 커밋

### 커밋 메시지 규칙
- Office 파일은 diff가 안 되므로, **무엇을 어떻게 바꿨는지** 메시지에 구체적으로 기록
- 예시: "거래처_관리대장.xlsx — C열 연락처 형식 통일, 신규 거래처 3건 추가"
- 나쁜 예: "엑셀 수정", "파일 업데이트"

### 위험 작업 전 보호
- 파일 삭제, 이름 변경, 대량 수정 전에는 반드시 커밋하여 복원 가능하게 할 것

## Hook — BOM 자동 추가 설정

### .ps1 파일 저장 시 자동 BOM 추가

`.claude/settings.json` 파일에 아래 내용을 넣으면, .ps1 파일을 저장할 때 자동으로 BOM이 추가됩니다:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(sed -n 's/.*\"file_path\" *: *\"\\([^\"]*\\)\".*/\\1/p'); [[ \"$f\" == *.ps1 ]] && { printf 'param([string]$p)\\n$c = Get-Content -Path $p -Raw -Encoding UTF8\\n$e = New-Object System.Text.UTF8Encoding($true)\\n[System.IO.File]::WriteAllText($p, $c, $e)' > /tmp/_addbom.ps1 && powershell -ExecutionPolicy Bypass -File /tmp/_addbom.ps1 -p \"$f\"; } 2>/dev/null || true",
            "timeout": 10,
            "statusMessage": "Adding UTF-8 BOM to .ps1 file..."
          }
        ]
      }
    ]
  }
}
```

### Hook 구조 설명
| 항목 | 값 | 설명 |
|------|-----|------|
| 이벤트 | `PostToolUse` | 도구 실행 **직후** 발동 |
| 매처 | `Write` | Write 도구가 파일을 저장했을 때만 |
| 동작 | 위 command | 저장된 파일이 `.ps1`이면 BOM 추가, 아니면 무시 |

## 언어
- 한국어로 응답하세요.
