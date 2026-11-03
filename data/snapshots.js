// 勢力図データ。国ごとの「支配者の変遷」を timeline として持ち、各スナップショット年の値を
// SENGOKU.snapshots[i].owners に展開する(下の即時関数)。国単位の概略であり、実際は郡・城単位で入り組む。
// x = kokujin(中小勢力・国人／不確定)。年は「その年以前で最後の変更」を採用。
window.SENGOKU = window.SENGOKU || {};
(function () {
  const T = {
    ezo: '1467 ainu',
    mutsu: '1467 x; 1584 date; 1590 toyotomi; 1600 uesugi; 1615 date',
    dewa: '1467 x; 1580 mogami',
    sado: '1467 x; 1590 uesugi; 1601 tokugawa',
    echigo: '1467 uesugi; 1600 tokugawa',
    noto: '1467 hatakeyama; 1580 uesugi; 1581 oda; 1584 toyotomi; 1600 tokugawa',
    shimotsuke: '1467 x; 1590 toyotomi; 1600 tokugawa',
    hitachi: '1467 satake; 1615 tokugawa',
    shimosa: '1467 x; 1555 hojo; 1590 tokugawa',
    kazusa: '1467 x; 1590 tokugawa',
    awa_b: '1467 x; 1530 satomi; 1615 tokugawa',
    kozuke: '1467 uesugi; 1555 x; 1560 uesugi; 1565 x; 1570 takeda; 1580 x; 1582 oda; 1584 hojo; 1590 tokugawa',
    musashi: '1467 uesugi; 1530 x; 1546 hojo; 1590 tokugawa',
    etchu: '1467 hatakeyama; 1530 x; 1560 uesugi; 1580 x; 1582 oda; 1584 toyotomi; 1600 tokugawa',
    shinano: '1467 x; 1551 takeda; 1582 oda; 1584 tokugawa; 1590 toyotomi; 1600 tokugawa',
    kai: '1467 takeda; 1582 oda; 1584 tokugawa; 1590 toyotomi; 1600 tokugawa',
    izu: '1467 x; 1500 hojo; 1590 tokugawa',
    sagami: '1467 uesugi; 1500 x; 1530 hojo; 1590 tokugawa',
    suruga: '1467 imagawa; 1568 takeda; 1582 tokugawa; 1590 toyotomi; 1600 tokugawa',
    totomi: '1467 shiba; 1530 imagawa; 1568 tokugawa; 1590 toyotomi; 1600 tokugawa',
    mikawa: '1467 x; 1530 tokugawa; 1551 imagawa; 1565 tokugawa; 1590 toyotomi; 1600 tokugawa',
    owari: '1467 shiba; 1530 oda; 1590 toyotomi; 1600 tokugawa',
    kaga: '1467 togashi; 1488 honganji; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    hida: '1467 x; 1584 toyotomi; 1600 tokugawa',
    echizen: '1467 shiba; 1471 asakura; 1573 oda; 1584 toyotomi; 1600 tokugawa',
    wakasa: '1467 x; 1560 asakura; 1570 oda; 1584 toyotomi; 1600 tokugawa',
    mino: '1467 toki; 1542 saito; 1567 oda; 1584 toyotomi; 1600 tokugawa',
    omi: '1467 rokkaku; 1560 x; 1565 asai; 1568 x; 1573 oda; 1584 toyotomi; 1600 tokugawa',
    ise: '1467 x; 1569 oda; 1590 toyotomi; 1600 tokugawa',
    iga: '1467 x; 1581 oda; 1585 toyotomi; 1600 tokugawa',
    shima: '1467 x; 1569 oda; 1585 toyotomi; 1600 tokugawa',
    yamato: '1467 x; 1560 miyoshi; 1568 oda; 1584 toyotomi; 1615 tokugawa',
    kii: '1467 hatakeyama; 1530 x; 1585 toyotomi; 1600 tokugawa',
    kawachi: '1467 hatakeyama; 1551 miyoshi; 1568 oda; 1584 toyotomi; 1615 tokugawa',
    izumi: '1467 hosokawa; 1551 miyoshi; 1568 oda; 1584 toyotomi; 1615 tokugawa',
    yamashiro: '1467 ashikaga; 1493 hosokawa; 1551 miyoshi; 1568 oda; 1584 toyotomi; 1615 tokugawa',
    settsu: '1467 hosokawa; 1551 miyoshi; 1568 oda; 1584 toyotomi; 1615 tokugawa',
    tanba: '1467 hosokawa; 1551 miyoshi; 1568 x; 1575 oda; 1584 toyotomi; 1600 tokugawa',
    tango: '1467 x; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    tajima: '1467 yamana; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    harima: '1467 akamatsu; 1551 x; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    inaba: '1467 yamana; 1560 x; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    hoki: '1467 yamana; 1530 amago; 1565 mori; 1600 tokugawa',
    oki: '1467 x; 1530 amago; 1565 mori; 1600 tokugawa',
    izumo: '1467 x; 1486 amago; 1566 mori; 1600 tokugawa',
    iwami: '1467 ouchi; 1546 x; 1551 ouchi; 1560 mori; 1600 tokugawa',
    bingo: '1467 yamana; 1500 x; 1560 mori; 1600 tokugawa',
    aki: '1467 ouchi; 1551 x; 1555 mori; 1600 tokugawa',
    suo: '1467 ouchi; 1557 mori',
    nagato: '1467 ouchi; 1557 mori',
    bitchu: '1467 hosokawa; 1530 x; 1566 mori; 1600 tokugawa',
    bizen: '1467 akamatsu; 1530 x; 1568 ukita; 1600 tokugawa',
    mimasaka: '1467 akamatsu; 1500 x; 1546 amago; 1551 x; 1584 ukita; 1600 tokugawa',
    sanuki: '1467 hosokawa; 1546 miyoshi; 1575 x; 1582 chosokabe; 1585 toyotomi; 1600 tokugawa',
    awaji: '1467 hosokawa; 1546 miyoshi; 1573 x; 1580 oda; 1584 toyotomi; 1600 tokugawa',
    awa_s: '1467 hosokawa; 1546 miyoshi; 1582 x; 1584 chosokabe; 1585 toyotomi; 1600 tokugawa',
    iyo: '1467 kono; 1575 x; 1585 mori; 1600 tokugawa',
    tosa: '1467 hosokawa; 1500 x; 1575 chosokabe; 1600 tokugawa',
    buzen: '1467 ouchi; 1560 x; 1565 otomo; 1587 toyotomi; 1600 tokugawa',
    bungo: '1467 otomo; 1600 tokugawa',
    chikuzen: '1467 ouchi; 1555 x; 1560 otomo; 1584 x; 1587 mori; 1600 tokugawa',
    chikugo: '1467 x; 1546 otomo; 1580 x; 1587 toyotomi; 1600 tokugawa',
    hizen: '1467 x; 1565 ryuzoji; 1584 x; 1587 ryuzoji; 1600 tokugawa',
    higo: '1467 kikuchi; 1530 x; 1550 otomo; 1565 x; 1578 ryuzoji; 1584 x; 1587 toyotomi; 1600 tokugawa',
    hyuga: '1467 x; 1530 ito; 1572 x; 1578 shimazu; 1587 x',
    osumi: '1467 x; 1555 shimazu',
    satsuma: '1467 shimazu; 1500 x; 1546 shimazu',
    iki: '1467 matsura',
    tsushima: '1467 so',
  };
  const ID = { x: 'kokujin' };
  const parse = (s) => s.split(';').map((t) => t.trim().split(/\s+/)).map(([y, c]) => [+y, ID[c] || c]);
  const TL = {};
  for (const k in T) TL[k] = parse(T[k]);

  const S = [
    [1467, '応仁の乱', '応仁の乱が始まる', '管領家の家督争いと将軍家の後継問題が重なり、細川勝元（東軍）と山名宗全（西軍）が京都で衝突。守護大名が領国を持ったまま京に集う「守護在京」の体制が崩れ始める。'],
    [1493, '明応の政変', '細川政元が将軍を替える', '細川政元が将軍足利義材（義稙）を追放し、義澄を擁立。将軍の権威が決定的に低下する。同じ頃、伊勢盛時（北条早雲）が伊豆へ進出した。'],
    [1500, '戦国前期', '各地で下剋上が進む', '守護代・国人が主家を倒す下剋上が広がる。加賀は一向一揆の「持ちたる国」、出雲では尼子経久が台頭、伊豆・相模では北条早雲が足場を築く。'],
    [1530, '享禄・天文', '守護大名から戦国大名へ', '駿河・遠江の今川、越後の長尾、尾張の織田、甲斐の武田、安房の里見など、新しい戦国大名が地域を固める。細川氏の内紛で畿内は三好氏の台頭を迎える。'],
    [1546, '河越夜戦', '北条氏康が関東の主導権を握る', '北条氏康が河越城で関東管領・古河公方の連合軍を破る。以後、北条は武蔵・下総へ勢力を広げる。畿内では三好長慶が頭角を現す。'],
    [1551, '大寧寺の変', '大内義隆、陶晴賢に討たれる', '周防で家臣の陶晴賢が大内義隆を討つ。西国最大の大名の分裂が、毛利元就の台頭につながる。信濃では武田晴信が着々と平定を進めている。'],
    [1555, '厳島の戦い', '毛利元就が陶晴賢を破る', '毛利元就は奇襲で陶晴賢の大軍を厳島で破り、安芸を手中に収める。織田信長は尾張の統一を進める。'],
    [1560, '桶狭間の戦い', '今川義元が討たれる', '織田信長が桶狭間で今川義元を討つ。今川の衰退が始まり、徳川家康（松平元康）が自立へ動く。近江では浅井長政が六角氏を破った。'],
    [1561, '第四次川中島', '武田信玄と上杉謙信の激突', '信濃北部の川中島で武田信玄と上杉謙信が最大の激戦を行う。決着はつかず、信濃は事実上武田が押さえた。'],
    [1565, '永禄の変', '将軍足利義輝が殺される', '三好義継・松永久秀らが将軍足利義輝を襲って殺害。京都は混乱し、足利義昭は越前の朝倉氏を頼る。'],
    [1568, '信長上洛', '織田信長が足利義昭を奉じて京へ', '美濃を制した信長は義昭を奉じて上洛し、畿内の三好勢を一掃。駿河は武田・徳川に分割され、今川氏は滅亡する。'],
    [1570, '姉川・金ヶ崎', '信長包囲網のはじまり', '信長は朝倉・浅井と姉川で戦う。石山本願寺も挙兵し、信長包囲網が形づくられる。'],
    [1573, '室町幕府の終わり', '足利義昭の追放と朝倉・浅井の滅亡', '武田信玄の西上途中での死去、義昭の追放（室町幕府の事実上の滅亡）、朝倉・浅井の滅亡と、信長を取り巻く情勢が大きく変わる。'],
    [1575, '長篠の戦い', '織田・徳川が武田勝頼を破る', '織田・徳川連合軍が長篠で鉄砲を活用し、武田勝頼に大勝。信長は越前一向一揆も鎮圧する。'],
    [1580, '石山本願寺の降伏', '信長の畿内支配が固まる', '石山本願寺が降伏し、加賀の一向一揆も鎮圧。羽柴秀吉は播磨・但馬を、明智光秀は丹波・丹後を攻略して、信長の領国は急拡大する。'],
    [1582, '本能寺の変', '信長の死と織田政権の動揺', '武田氏は3月に滅亡。しかし6月、信長は本能寺で明智光秀に討たれる。直後に山崎の戦いで光秀は羽柴秀吉に敗れた。'],
    [1584, '小牧・長久手', '秀吉と家康・信雄の対立', '賤ヶ岳の戦いで柴田勝家が敗れた後、羽柴秀吉は織田信雄・徳川家康連合と小牧・長久手で対峙した。戦いは和睦に終わり、家康は秀吉に臣従する形へ向かう。'],
    [1587, '九州平定', '秀吉が島津氏を降す', '秀吉は四国（1585）、九州（1587）を平定。島津氏は薩摩・大隅などを保って降伏し、長宗我部氏は土佐一国となった。'],
    [1590, '小田原征伐', '秀吉の天下統一', '豊臣秀吉が小田原城の北条氏を降し、伊達政宗ら東国の大名も服属。徳川家康は関東に移され、各地に豊臣系大名が配置された。'],
    [1600, '関ヶ原の戦い', '家康が天下を握る', '関ヶ原で徳川家康率いる東軍が勝利。戦後、西軍諸将は改易・減封され、毛利氏は周防・長門に縮小。ここでは東軍系大名の領地を「徳川」の勢力として概括している。'],
    [1615, '大坂夏の陣', '豊臣氏の滅亡', '大坂夏の陣で豊臣秀頼が自害し、豊臣家は滅亡。江戸幕府の支配が全国に及ぶ「元和偃武」の時代へ入る。'],
  ];

  const owners = (year) => {
    const o = {};
    for (const k in TL) {
      let cur = null;
      for (const [y, c] of TL[k]) if (y <= year) cur = c;
      o[k] = cur;
    }
    return o;
  };
  window.SENGOKU.snapshots = S.map(([year, label, title, note]) => ({ year, label, title, note, owners: owners(year) }));
  window.SENGOKU.timelines = TL;
})();
