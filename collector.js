const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const SOURCES = [
    { id: "mss_incheon", name: "인천중소벤처기업청", url: "https://www.mss.go.kr/site/incheon/ex/bbs/List.do?cbIdx=248" },
    { id: "kosmes", name: "중소벤처기업진흥공단", url: "https://www.kosmes.or.kr/nsh/nt/bbs/getBbsList.do?bbsCategory=01" },
    { id: "smr", name: "성남시장권활성화재단", url: "https://www.smr.or.kr/base/board/list?boardManagementNo=1" },
    { id: "gmr", name: "경기도상권진흥원", url: "https://www.gmr.or.kr/base/board/list?boardManagementNo=1" },
    { id: "bizok", name: "비즈오케이(인천)", url: "https://bizok.incheon.go.kr/open_content/biz.do" },
    { id: "wbiz", name: "여성기업종합정보포털", url: "https://www.wbiz.or.kr/notice/biz.do" },
    { id: "semas", name: "소상공인시장진흥공단", url: "https://www.semas.or.kr/web/board/webBoardList.do?boardId=30" },
    { id: "insupport", name: "인천소상공인지원센터", url: "https://www.insupport.or.kr/sub/sub03_02.php" },
    { id: "nhn_commerce", name: "NHN커머스", url: "https://www.nhn-commerce.com/support/notice-list.gd" },
    { id: "gobiz", name: "고비즈", url: "https://kr.gobizkorea.com/customer/notice/noticeList.do" },
    { id: "fanfandaero", name: "판판대로", url: "https://fanfandaero.kr/portal/read/readDetail.do" },
    { id: "sbiz24", name: "소상공인24", url: "https://www.sbiz24.kr/#/combinePblanc" },
    { id: "kodma", name: "한국소상공인기업총연합회", url: "https://www.kodma.or.kr/bbs/list.do?&bbs_cd=notice" },
    { id: "ymf_notice", name: "전통시장육성재단(공지)", url: "https://www.ymf.or.kr/sub/sub03_03.php" },
    { id: "ymf_related", name: "전통시장육성재단(유관)", url: "https://www.ymf.or.kr/sub/sub03_05.php" }
];

async function collect() {
    console.log("🚀 [정밀 수집] 15개 기관을 샅샅이 뒤집니다. (약 3분 소요)");
    const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
    let allItems = [];
    let siteStatus = {};
    const keywords = ['컨설팅', '모집', '공고', '지원사업', '2026'];

    for (const s of SOURCES) {
        const page = await browser.newPage();
        try {
            console.log(`[작업] ${s.name} 접속...`);
            await page.goto(s.url, { waitUntil: 'networkidle2', timeout: 45000 });
            await new Promise(r => setTimeout(r, 4000));

            const data = await page.evaluate((kws, sName, sId) => {
                const results = [];
                const rows = Array.from(document.querySelectorAll('tr, li, .list_item'));
                rows.forEach(row => {
                    if (kws.some(kw => row.innerText.includes(kw))) {
                        const a = row.querySelector('a');
                        if (a && a.innerText.trim().length > 5) {
                            results.push({ source_id: sId, source_name: sName, title: a.innerText.trim(), url: a.href });
                        }
                    }
                });
                return results;
            }, keywords, s.name, s.id);

            if (data.length > 0) {
                allItems = allItems.concat(data.map(d => ({ ...d, notice_date: "2026-01-27", is_new: true })));
                siteStatus[s.id] = "success";
                console.log(`  └─ ✅ 성공: ${data.length}건`);
            } else {
                siteStatus[s.id] = "zero";
                console.log(`  └─ ⚠️ 0건 (키워드 없음)`);
            }
        } catch (e) {
            siteStatus[s.id] = "fail";
            console.log(`  └─ ❌ 에러/차단`);
        } finally { await page.close(); }
    }
    await browser.close();
    fs.writeFileSync('feed.json', JSON.stringify({ generated_at: new Date().toISOString(), items: allItems, status: siteStatus }, null, 2));
    console.log(`\n🏆 15개 기관 수집 종료!`);
}
collect();