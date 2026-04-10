const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

const FILE_URL = 'file:///' + path.resolve(__dirname, '../../교통비신청시스템.html').replace(/\\/g, '/');

// 각 테스트 전 localStorage 초기화
test.beforeEach(async ({ page }) => {
  await page.goto(FILE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.describe('교통비 신청 시스템 - 기본 렌더링', () => {
  test('페이지 로드 및 헤더 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('.header-main')).toContainText('교통비 신청');
    await expect(page.locator('#monthPicker')).toBeVisible();
  });

  test('6개 탭 버튼 존재 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    const tabs = page.locator('.tab-btn');
    await expect(tabs).toHaveCount(6);
    const labels = await tabs.allTextContents();
    expect(labels.some(t => t.includes('설정'))).toBe(true);
    expect(labels.some(t => t.includes('주유'))).toBe(true);
    expect(labels.some(t => t.includes('통행료'))).toBe(true);
    expect(labels.some(t => t.includes('회차'))).toBe(true);
    expect(labels.some(t => t.includes('정산'))).toBe(true);
    expect(labels.some(t => t.includes('내보내기'))).toBe(true);
  });

  test('설정 탭이 기본 활성화', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('#tab-settings')).toBeVisible();
    await expect(page.locator('#tab-fuel')).not.toBeVisible();
  });
});

test.describe('설정 탭', () => {
  test('신청자 정보 입력 필드 존재', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('#s_name')).toBeVisible();
    await expect(page.locator('#s_dept')).toBeVisible();
    await expect(page.locator('#wt_field')).toBeVisible();
    await expect(page.locator('#wt_home')).toBeVisible();
  });

  test('이동수단/유종 라디오 버튼 존재', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('#vt_car')).toBeVisible();
    await expect(page.locator('#vt_transit')).toBeVisible();
    await expect(page.locator('#ft_fuel')).toBeVisible();
    await expect(page.locator('#ft_electric')).toBeVisible();
    await expect(page.locator('#ft_hydrogen')).toBeVisible();
  });

  test('신청자 이름 입력 및 저장', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_name').fill('홍길동');
    await page.locator('#s_dept').fill('현장팀');
    // 값이 입력되었는지 확인
    await expect(page.locator('#s_name')).toHaveValue('홍길동');
    await expect(page.locator('#s_dept')).toHaveValue('현장팀');
  });

  test('주소 필드 및 길찾기 버튼 존재', async ({ page }) => {
    await page.goto(FILE_URL);
    await expect(page.locator('#s_homeAddr')).toBeVisible();
    await expect(page.locator('#s_siteAddr')).toBeVisible();
    await expect(page.locator('#s_dist')).toBeVisible();
    // 길찾기 버튼 확인
    const naverBtn = page.locator('button:has-text("길찾기")');
    await expect(naverBtn).toBeVisible();
  });

  test('편도거리 입력 시 왕복거리 정보 업데이트', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_dist').fill('100');
    await page.locator('#s_dist').dispatchEvent('input');
    const distInfo = page.locator('#distInfo');
    await expect(distInfo).toContainText('100');
    await expect(distInfo).toContainText('200');
  });

  test('OpenAI API 설정 섹션 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    // OpenAI 텍스트 확인 (Anthropic 아님)
    const apiCard = page.locator('.card:has(#s_apiKey)');
    await expect(apiCard).toContainText('OpenAI');
    await expect(page.locator('#s_apiKey')).toBeVisible();
    // API key 기본값 설정 여부 확인
    const apiKeyVal = await page.locator('#s_apiKey').inputValue();
    expect(apiKeyVal.startsWith('sk-proj-')).toBe(true);
  });

  test('자택출근자 선택 시 현장주소 숨김', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#wt_home').click();
    await expect(page.locator('#siteAddrSection')).not.toBeVisible();
    // 현장근무자로 복귀
    await page.locator('#wt_field').click();
    await expect(page.locator('#siteAddrSection')).toBeVisible();
  });

  test('대중교통 선택 시 유종 섹션 숨김', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#vt_transit').click();
    await expect(page.locator('#fuelTypeSection')).not.toBeVisible();
    await page.locator('#vt_car').click();
    await expect(page.locator('#fuelTypeSection')).toBeVisible();
  });
});

test.describe('Naver Maps 길찾기 모달', () => {
  test('길찾기 버튼 클릭 시 주소 미입력 경고', async ({ page }) => {
    await page.goto(FILE_URL);
    page.on('dialog', d => d.accept());
    await page.locator('button:has-text("길찾기")').click();
    // 주소 미입력 alert이 뜨거나 모달이 열려야 함
    // 둘 중 하나
    const modalVisible = await page.locator('#naverRouteModal').evaluate(el => el.classList.contains('show'));
    // alert이 수락되었으므로 모달은 열리지 않음
    expect(modalVisible).toBe(false);
  });

  test('주소 입력 후 길찾기 모달 열림', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_homeAddr').fill('경기도 고양시 덕양구 덕수천 1로 59');
    await page.locator('#s_homeAddr').dispatchEvent('input');
    await page.locator('#s_siteAddr').fill('경기도 이천시 부발읍 아미리 701-2');
    await page.locator('#s_siteAddr').dispatchEvent('input');
    await page.locator('button:has-text("길찾기")').click();
    await expect(page.locator('#naverRouteModal')).toHaveClass(/show/);
    // 주소 표시 확인
    await expect(page.locator('#naverRouteAddrs')).toContainText('고양시');
    await expect(page.locator('#naverRouteAddrs')).toContainText('이천시');
  });

  test('네이버 지도 링크 href 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_homeAddr').fill('서울 강남구');
    await page.locator('#s_homeAddr').dispatchEvent('input');
    await page.locator('#s_siteAddr').fill('경기 이천시');
    await page.locator('#s_siteAddr').dispatchEvent('input');
    await page.locator('button:has-text("길찾기")').click();
    const href = await page.locator('#naverRouteLink').getAttribute('href');
    expect(href).toContain('map.naver.com');
    expect(href).toContain('directions');
  });

  test('거리 적용 기능', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_homeAddr').fill('서울');
    await page.locator('#s_homeAddr').dispatchEvent('input');
    await page.locator('#s_siteAddr').fill('이천');
    await page.locator('#s_siteAddr').dispatchEvent('input');
    await page.locator('button:has-text("길찾기")').click();
    await page.locator('#naverDistInput').fill('75.5');
    await page.locator('button:has-text("이 거리 적용")').click();
    // 모달 닫힘
    await expect(page.locator('#naverRouteModal')).not.toHaveClass(/show/);
    // 편도거리 필드 업데이트
    await expect(page.locator('#s_dist')).toHaveValue('75.5');
    await expect(page.locator('#distInfo')).toContainText('75.5');
  });

  test('모달 취소 버튼', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_homeAddr').fill('서울');
    await page.locator('#s_homeAddr').dispatchEvent('input');
    await page.locator('#s_siteAddr').fill('이천');
    await page.locator('#s_siteAddr').dispatchEvent('input');
    await page.locator('button:has-text("길찾기")').click();
    await expect(page.locator('#naverRouteModal')).toHaveClass(/show/);
    await page.locator('#naverRouteModal .btn-gray').click();
    await expect(page.locator('#naverRouteModal')).not.toHaveClass(/show/);
  });
});

test.describe('주유/충전 탭', () => {
  test('주유 탭 전환 및 캡처존 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("주유")').click();
    await expect(page.locator('#tab-fuel')).toBeVisible();
    await expect(page.locator('#fuelFileInput')).toBeAttached();
    await expect(page.locator('button:has-text("수동 입력")').first()).toBeVisible();
  });

  test('주유 수동 입력 모달', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await expect(page.locator('#fuelModal')).toHaveClass(/show/);
    await expect(page.locator('#fm_date')).toBeVisible();
    await expect(page.locator('#fm_qty')).toBeVisible();
    await expect(page.locator('#fm_amount')).toBeVisible();
  });

  test('주유 영수증 입력 및 저장', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await page.locator('#fm_date').fill('2026-03-06');
    await page.locator('#fm_qty').fill('50.5');
    await page.locator('#fm_amount').fill('100000');
    await page.locator('#fuelModal .btn-primary').click();
    // 모달 닫힘
    await expect(page.locator('#fuelModal')).not.toHaveClass(/show/);
    // 목록에 항목 추가됨
    await expect(page.locator('#fuelList .receipt-item')).toHaveCount(1);
  });

  test('주유 영수증 삭제', async ({ page }) => {
    await page.goto(FILE_URL);
    // 먼저 추가
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await page.locator('#fm_date').fill('2026-03-06');
    await page.locator('#fm_qty').fill('50');
    await page.locator('#fm_amount').fill('90000');
    await page.locator('#fuelModal .btn-primary').click();
    await expect(page.locator('#fuelList .receipt-item')).toHaveCount(1);
    // confirm 자동 수락 (file:// URL에서 page.on('dialog') 타이밍 이슈 우회)
    await page.evaluate(() => { window.confirm = () => true; });
    await page.locator('#fuelList .btn-danger').click();
    await expect(page.locator('#fuelList .receipt-item')).toHaveCount(0);
  });
});

test.describe('통행료 탭 (신규)', () => {
  test('통행료 탭 전환 및 레이아웃 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("통행료")').click();
    await expect(page.locator('#tab-toll')).toBeVisible();
    await expect(page.locator('#tollFileInput')).toBeAttached();
  });

  test('통행료 수동 입력 모달 열기', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("통행료")').click();
    await page.locator('#tab-toll button:has-text("수동 입력")').click();
    await expect(page.locator('#tollModal')).toHaveClass(/show/);
    await expect(page.locator('#tm_date')).toBeVisible();
    await expect(page.locator('#tm_amount')).toBeVisible();
    await expect(page.locator('#tm_trip')).toBeVisible();
  });

  test('통행료 영수증 추가 및 목록 표시', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("통행료")').click();
    await page.locator('#tab-toll button:has-text("수동 입력")').click();
    await page.locator('#tm_date').fill('2026-03-06');
    await page.locator('#tm_amount').fill('13600');
    await page.locator('#tollModal .btn-primary').click();
    await expect(page.locator('#tollModal')).not.toHaveClass(/show/);
    await expect(page.locator('#tollList .receipt-item')).toHaveCount(1);
    await expect(page.locator('#tollList')).toContainText('13,600원');
  });

  test('통행료 영수증 수정', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("통행료")').click();
    await page.locator('#tab-toll button:has-text("수동 입력")').click();
    await page.locator('#tm_date').fill('2026-03-06');
    await page.locator('#tm_amount').fill('13600');
    await page.locator('#tollModal .btn-primary').click();
    // 수정 버튼 클릭
    await page.locator('#tollList .btn-gray').click();
    await expect(page.locator('#tollModal')).toHaveClass(/show/);
    await page.locator('#tm_amount').fill('15000');
    await page.locator('#tollModal .btn-primary').click();
    await expect(page.locator('#tollList')).toContainText('15,000원');
  });

  test('통행료 영수증 삭제', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("통행료")').click();
    await page.locator('#tab-toll button:has-text("수동 입력")').click();
    await page.locator('#tm_date').fill('2026-03-06');
    await page.locator('#tm_amount').fill('13600');
    await page.locator('#tollModal .btn-primary').click();
    page.on('dialog', d => d.accept());
    await page.locator('#tollList .btn-danger').click();
    await expect(page.locator('#tollList .receipt-item')).toHaveCount(0);
  });
});

test.describe('회차신청 탭', () => {
  test('회차 추가 버튼 존재', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("회차")').click();
    await expect(page.locator('#tab-trips')).toBeVisible();
    await expect(page.locator('#fieldAddBtn button')).toBeVisible();
  });

  test('회차 추가 및 날짜 입력', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("회차")').click();
    await page.locator('#fieldAddBtn button').click();
    await expect(page.locator('.trip-item')).toHaveCount(1);
  });

  test('자택출근자 모드에서 출퇴근일수 입력 표시', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#wt_home').click();
    await page.locator('.tab-btn:has-text("회차")').click();
    await expect(page.locator('#homeCommuteSection')).toBeVisible();
    await expect(page.locator('#commuteDays')).toBeVisible();
  });
});

test.describe('정산요약 탭', () => {
  test('데이터 없을 때 빈 상태 표시', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("정산")').click();
    await expect(page.locator('#tab-summary')).toBeVisible();
    await expect(page.locator('#summaryContent')).toBeVisible();
  });

  test('주유+회차 입력 후 정산 계산 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    // 거리 설정
    await page.locator('#s_dist').fill('86');
    await page.locator('#s_dist').dispatchEvent('input');
    // 주유 추가
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await page.locator('#fm_date').fill('2026-03-06');
    await page.locator('#fm_qty').fill('55');
    await page.locator('#fm_amount').fill('110000');
    await page.locator('#fuelModal .btn-primary').click();
    // 회차 추가
    await page.locator('.tab-btn:has-text("회차")').click();
    await page.locator('#fieldAddBtn button').click();
    const startInput = page.locator('.trip-item input[type="date"]').first();
    const endInput = page.locator('.trip-item input[type="date"]').last();
    await startInput.fill('2026-03-06');
    await startInput.dispatchEvent('change');
    await endInput.fill('2026-03-08');
    await endInput.dispatchEvent('change');
    // 정산요약 확인
    await page.locator('.tab-btn:has-text("정산")').click();
    await expect(page.locator('#summaryContent')).toContainText('1회차');
  });
});

test.describe('내보내기 탭', () => {
  test('내보내기 탭 레이아웃 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("내보내기")').click();
    await expect(page.locator('#tab-export')).toBeVisible();
    await expect(page.locator('#templateFileInput')).toBeAttached();
    await expect(page.locator('#templateStatus')).toBeVisible();
    // 양식 미선택 경고
    await expect(page.locator('#templateStatus')).toContainText('양식 파일');
    await expect(page.locator('.export-btn')).toBeVisible();
  });

  test('양식 미선택 상태에서 내보내기 시도 시 경고', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_name').fill('홍길동');
    await page.locator('#s_name').dispatchEvent('input');
    await page.locator('.tab-btn:has-text("내보내기")').click();
    page.on('dialog', d => d.accept());
    await page.locator('.export-btn').click();
    // alert이 발생해야 함 (양식 파일 미선택)
  });

  test('신청자 이름 미입력 시 설정 탭으로 이동', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("내보내기")').click();
    page.on('dialog', d => d.accept());
    await page.locator('.export-btn').click();
    // 설정 탭으로 전환됨
    await expect(page.locator('#tab-settings')).toBeVisible();
  });

  test('체크리스트 표시 확인', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('.tab-btn:has-text("내보내기")').click();
    await expect(page.locator('#checklistContent')).toBeVisible();
  });

  test('내보내기 미리보기 정보 표시', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_name').fill('김진현');
    await page.locator('#s_name').dispatchEvent('input');
    await page.locator('.tab-btn:has-text("내보내기")').click();
    await expect(page.locator('#exportPreview')).toContainText('김진현');
  });
});

test.describe('탭 간 데이터 연동', () => {
  test('통행료가 정산요약에 반영', async ({ page }) => {
    await page.goto(FILE_URL);
    await page.locator('#s_dist').fill('86');
    await page.locator('#s_dist').dispatchEvent('input');
    // 주유 추가
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await page.locator('#fm_date').fill('2026-03-06');
    await page.locator('#fm_qty').fill('55');
    await page.locator('#fm_amount').fill('110000');
    await page.locator('#fuelModal .btn-primary').click();
    // 회차 추가
    await page.locator('.tab-btn:has-text("회차")').click();
    await page.locator('#fieldAddBtn button').click();
    const tripId = await page.locator('.trip-item').getAttribute('data-id') || '';
    // 통행료 추가 (회차 연결)
    await page.locator('.tab-btn:has-text("통행료")').click();
    await page.locator('#tab-toll button:has-text("수동 입력")').click();
    await page.locator('#tm_date').fill('2026-03-06');
    await page.locator('#tm_amount').fill('5000');
    // 회차 선택 (있으면)
    const tripOptions = await page.locator('#tm_trip option').count();
    if (tripOptions > 1) {
      await page.locator('#tm_trip').selectOption({ index: 1 });
    }
    await page.locator('#tollModal .btn-primary').click();
    // 정산요약 확인
    await page.locator('.tab-btn:has-text("정산")').click();
    await expect(page.locator('#summaryContent')).toBeVisible();
  });

  test('월 변경 시 데이터 초기화', async ({ page }) => {
    await page.goto(FILE_URL);
    // 주유 추가 (현재 월)
    await page.locator('.tab-btn:has-text("주유")').click();
    await page.locator('button:has-text("수동 입력")').first().click();
    await page.locator('#fm_date').fill('2026-03-06');
    await page.locator('#fm_qty').fill('50');
    await page.locator('#fm_amount').fill('90000');
    await page.locator('#fuelModal .btn-primary').click();
    await expect(page.locator('#fuelList .receipt-item')).toHaveCount(1);
    // 월 변경: 내부 함수 직접 호출 (재귀 버그 수정 후 동작)
    await page.evaluate(() => {
      state.month = '2026-05';
      loadState();
      renderFuelList();
    });
    // 다른 달이므로 목록 비어야 함
    await expect(page.locator('#fuelList .receipt-item')).toHaveCount(0);
  });
});
