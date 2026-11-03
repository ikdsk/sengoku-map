// 人物データ。wiki は日本語版 Wikipedia の記事名(曖昧さ回避ページ不可)。
// fetch-images.mjs は取得結果の記事タイトルと wiki を照合する。fuzzy:true は生没年に諸説あり。
window.SENGOKU = window.SENGOKU || {};
window.SENGOKU.people = [
  // --- 室町幕府・管領家（応仁の乱） ---
  { id: 'ashikaga-yoshimasa', name: '足利義政', kana: 'あしかが よしまさ', birth: 1436, death: 1490, clan: 'ashikaga', role: '室町幕府8代将軍', wiki: '足利義政', desc: '応仁の乱当時の将軍。政治への意欲を失い、のち東山山荘（銀閣）を造営した。後継をめぐる弟義視と子義尚の対立が乱の一因となる。' },
  { id: 'hosokawa-katsumoto', name: '細川勝元', kana: 'ほそかわ かつもと', birth: 1430, death: 1473, clan: 'hosokawa', role: '管領・東軍の総大将', wiki: '細川勝元', desc: '応仁の乱で東軍を率いた。山名宗全と同じ1473年に没する。' },
  { id: 'yamana-sozen', name: '山名宗全', kana: 'やまな そうぜん', birth: 1404, death: 1473, clan: 'yamana', role: '但馬ほか守護・西軍の総大将', wiki: '山名宗全', desc: '出家名の宗全で知られる山名持豊。細川勝元と対立し、西軍の大将として応仁の乱を戦った。' },
  { id: 'hosokawa-masamoto', name: '細川政元', kana: 'ほそかわ まさもと', birth: 1466, death: 1507, clan: 'hosokawa', role: '管領', wiki: '細川政元', desc: '1493年の明応の政変で将軍義材を廃し、事実上の最高権力者となった。のち家督をめぐる内紛（永正の錯乱）で暗殺される。' },
  { id: 'ashikaga-yoshiteru', name: '足利義輝', kana: 'あしかが よしてる', birth: 1536, death: 1565, clan: 'ashikaga', role: '室町幕府13代将軍', wiki: '足利義輝', desc: '剣豪将軍とも呼ばれる。三好氏と争いつつ幕府権威の回復を図ったが、1565年の永禄の変で殺害された。' },
  { id: 'ashikaga-yoshiaki', name: '足利義昭', kana: 'あしかが よしあき', birth: 1537, death: 1597, clan: 'ashikaga', role: '室町幕府15代将軍', wiki: '足利義昭', desc: '織田信長に奉じられて上洛し将軍となるが、のち信長と対立。1573年に京都を追われ、室町幕府は事実上滅びた。' },

  // --- 織田 ---
  { id: 'oda-nobuhide', name: '織田信秀', kana: 'おだ のぶひで', birth: 1511, death: 1552, clan: 'oda', role: '尾張の戦国大名・信長の父', wiki: '織田信秀', fuzzy: true, desc: '尾張守護代の家臣の家から勢力を広げ、美濃・三河へも出兵した。生没年には諸説ある。' },
  { id: 'oda-nobunaga', name: '織田信長', kana: 'おだ のぶなが', birth: 1534, death: 1582, clan: 'oda', role: '戦国大名・天下人', wiki: '織田信長', desc: '桶狭間で今川義元を破り、美濃を制して1568年に上洛。比叡山・石山本願寺・武田氏らと戦い畿内を掌握したが、1582年に本能寺で明智光秀に討たれた。' },
  { id: 'oda-nobutada', name: '織田信忠', kana: 'おだ のぶただ', birth: 1557, death: 1582, clan: 'oda', role: '信長の嫡男', wiki: '織田信忠', desc: '武田攻めの総大将を務め、家督を譲られていた。本能寺の変の際に二条御所で自害した。' },
  { id: 'oda-nobukatsu', name: '織田信雄', kana: 'おだ のぶかつ', birth: 1558, death: 1630, clan: 'oda', role: '信長の次男', wiki: '織田信雄', desc: '本能寺の変後、尾張・伊勢を領した。小牧・長久手の戦いで徳川家康と組んだが、のち秀吉に従う。' },
  { id: 'akechi-mitsuhide', name: '明智光秀', kana: 'あけち みつひで', birth: 1528, death: 1582, clan: 'oda', role: '織田家の重臣', wiki: '明智光秀', fuzzy: true, desc: '丹波・近江坂本を任された信長の重臣。1582年に本能寺の変を起こしたが、山崎の戦いで羽柴秀吉に敗れて死去した。生年には諸説ある。' },
  { id: 'shibata-katsuie', name: '柴田勝家', kana: 'しばた かついえ', birth: 1522, death: 1583, clan: 'oda', role: '織田家の筆頭家老', wiki: '柴田勝家', fuzzy: true, desc: '北陸方面軍を率いて越前・加賀を治めた。信長の死後、賤ヶ岳の戦いで羽柴秀吉に敗れ、北ノ庄城で自害した。' },
  { id: 'niwa-nagahide', name: '丹羽長秀', kana: 'にわ ながひで', birth: 1535, death: 1585, clan: 'oda', role: '織田家の重臣', wiki: '丹羽長秀', desc: '信長の側近として安土城の普請などを担った。信長の死後は秀吉に従い、越前などを領した。' },
  { id: 'maeda-toshiie', name: '前田利家', kana: 'まえだ としいえ', birth: 1538, death: 1599, clan: 'toyotomi', role: '加賀藩の祖・豊臣五大老', wiki: '前田利家', desc: '信長の側近から能登・加賀・越中の大名となり、豊臣政権では五大老の一人として秀頼を支えた。' },

  // --- 豊臣 ---
  { id: 'toyotomi-hideyoshi', name: '豊臣秀吉', kana: 'とよとみ ひでよし', birth: 1537, death: 1598, clan: 'toyotomi', role: '関白・天下人', wiki: '豊臣秀吉', fuzzy: true, desc: '尾張の農民出身と伝えられ、信長の家臣から天下人へ。本能寺の変の後に明智光秀・柴田勝家を倒し、1590年に全国を統一した。生年には諸説ある。' },
  { id: 'toyotomi-hidenaga', name: '豊臣秀長', kana: 'とよとみ ひでなが', birth: 1540, death: 1591, clan: 'toyotomi', role: '秀吉の異父弟', wiki: '豊臣秀長', desc: '兄秀吉を補佐した調整役。大和郡山を拠点に紀伊・和泉・大和を治めた。' },
  { id: 'toyotomi-hideyori', name: '豊臣秀頼', kana: 'とよとみ ひでより', birth: 1593, death: 1615, clan: 'toyotomi', role: '秀吉の子', wiki: '豊臣秀頼', desc: '秀吉の死後、わずか6歳で跡を継ぐ。大坂の陣で敗れ、母淀殿とともに大坂城で自害した。' },
  { id: 'kuroda-kanbei', name: '黒田官兵衛', kana: 'くろだ かんべえ', birth: 1546, death: 1604, clan: 'toyotomi', role: '秀吉の軍師', wiki: '黒田孝高', desc: '黒田孝高（如水）。播磨の小寺氏の家臣から秀吉の参謀となり、九州平定などで活躍した。' },
  { id: 'ishida-mitsunari', name: '石田三成', kana: 'いしだ みつなり', birth: 1560, death: 1600, clan: 'toyotomi', role: '豊臣政権の五奉行', wiki: '石田三成', desc: '近江出身の秀吉の側近。検地や兵站を担った。関ヶ原で西軍の中心となり、敗れて京都で処刑された。' },
  { id: 'kato-kiyomasa', name: '加藤清正', kana: 'かとう きよまさ', birth: 1562, death: 1611, clan: 'toyotomi', role: '肥後の大名', wiki: '加藤清正', desc: '賤ヶ岳七本槍の一人。肥後熊本を治め、熊本城を築いた。関ヶ原では東軍に属した。' },
  { id: 'fukushima-masanori', name: '福島正則', kana: 'ふくしま まさのり', birth: 1561, death: 1624, clan: 'toyotomi', role: '尾張清洲の大名', wiki: '福島正則', desc: '賤ヶ岳七本槍の一人。関ヶ原では東軍の先鋒を務め、戦後は安芸・備後に加増された。' },

  // --- 徳川・松平 ---
  { id: 'tokugawa-ieyasu', name: '徳川家康', kana: 'とくがわ いえやす', birth: 1543, death: 1616, clan: 'tokugawa', role: '江戸幕府初代将軍', wiki: '徳川家康', desc: '三河の松平氏に生まれ、今川氏の人質を経て自立。信長と同盟し、秀吉に臣従したのち、関ヶ原に勝利して1603年に江戸幕府を開いた。' },
  { id: 'tokugawa-hidetada', name: '徳川秀忠', kana: 'とくがわ ひでただ', birth: 1579, death: 1632, clan: 'tokugawa', role: '江戸幕府2代将軍', wiki: '徳川秀忠', desc: '家康の三男。1605年に将軍職を継ぎ、大坂の陣では幕府軍を率いた。' },
  { id: 'matsudaira-hirotada', name: '松平広忠', kana: 'まつだいら ひろただ', birth: 1526, death: 1549, clan: 'tokugawa', role: '三河の岡崎城主・家康の父', wiki: '松平広忠', desc: '織田氏・今川氏の間で苦しい立場に置かれ、今川氏に従属して嫡子竹千代（家康）を人質に出した。' },
  { id: 'honda-tadakatsu', name: '本多忠勝', kana: 'ほんだ ただかつ', birth: 1548, death: 1610, clan: 'tokugawa', role: '徳川四天王', wiki: '本多忠勝', desc: '徳川家康を支えた猛将。生涯に大小57の戦に出て、かすり傷一つ負わなかったと伝わる。' },
  { id: 'ii-naomasa', name: '井伊直政', kana: 'いい なおまさ', birth: 1561, death: 1602, clan: 'tokugawa', role: '徳川四天王', wiki: '井伊直政', desc: '「赤備え」を率いた徳川四天王の一人。関ヶ原での戦功により近江佐和山に封じられた。' },
  { id: 'sanada-masayuki', name: '真田昌幸', kana: 'さなだ まさゆき', birth: 1547, death: 1611, clan: null, role: '信濃上田の国人・大名', wiki: '真田昌幸', desc: '武田氏に仕え、信濃上田城で徳川軍を二度退けた（上田合戦）。関ヶ原では子の信繁とともに西軍についた。' },
  { id: 'sanada-yukimura', name: '真田信繁', kana: 'さなだ のぶしげ', birth: 1567, death: 1615, clan: 'toyotomi', role: '大坂の陣の武将', wiki: '真田信繁', desc: '通称は幸村。大坂夏の陣で徳川家康の本陣に迫る奮戦を見せて討死した。' },

  // --- 武田 ---
  { id: 'takeda-nobutora', name: '武田信虎', kana: 'たけだ のぶとら', birth: 1494, death: 1574, clan: 'takeda', role: '甲斐の戦国大名', wiki: '武田信虎', desc: '甲斐の内乱を鎮めて統一した。1541年に嫡子晴信（信玄）によって駿河へ追放された。' },
  { id: 'takeda-shingen', name: '武田信玄', kana: 'たけだ しんげん', birth: 1521, death: 1573, clan: 'takeda', role: '甲斐の戦国大名', wiki: '武田信玄', desc: '信濃を平定し、上杉謙信と川中島で戦う。西上作戦の途上、1573年に病没した。' },
  { id: 'takeda-katsuyori', name: '武田勝頼', kana: 'たけだ かつより', birth: 1546, death: 1582, clan: 'takeda', role: '武田信玄の四男', wiki: '武田勝頼', desc: '信玄の死後に家督を継ぐ。長篠の戦いで大敗し、1582年に天目山で自害して武田氏は滅亡した。' },
  { id: 'baba-nobuharu', name: '馬場信春', kana: 'ばば のぶはる', birth: 1515, death: 1575, clan: 'takeda', role: '武田四名臣', wiki: '馬場信春', desc: '武田氏譜代の重臣。長篠の戦いで勝頼の退却を支え、殿軍を務めて討死した。' },

  // --- 上杉・長尾 ---
  { id: 'nagao-tamekage', name: '長尾為景', kana: 'ながお ためかげ', birth: 1489, death: 1543, clan: 'uesugi', role: '越後守護代', wiki: '長尾為景', fuzzy: true, desc: '越後守護の上杉房能を倒して実権を握り、謙信の父となった。' },
  { id: 'uesugi-kenshin', name: '上杉謙信', kana: 'うえすぎ けんしん', birth: 1530, death: 1578, clan: 'uesugi', role: '越後の戦国大名・関東管領', wiki: '上杉謙信', desc: '長尾景虎として越後を統一し、関東管領の上杉の名跡を継いだ。武田信玄と川中島で戦い、越中・能登へも進出。1578年、遠征の準備中に没した。' },
  { id: 'uesugi-kagekatsu', name: '上杉景勝', kana: 'うえすぎ かげかつ', birth: 1556, death: 1623, clan: 'uesugi', role: '謙信の養子・会津120万石', wiki: '上杉景勝', desc: '御館の乱に勝って謙信の跡を継ぐ。豊臣政権で五大老となり、会津に移封。関ヶ原では家康と敵対した。' },
  { id: 'naoe-kanetsugu', name: '直江兼続', kana: 'なおえ かねつぐ', birth: 1560, death: 1620, clan: 'uesugi', role: '上杉家の重臣', wiki: '直江兼続', desc: '景勝を支えた重臣。1600年、徳川家康に宛てたとされる「直江状」や、最上領への侵攻（長谷堂城の戦い）で知られる。' },

  // --- 北条 ---
  { id: 'hojo-soun', name: '北条早雲', kana: 'ほうじょう そううん', birth: 1456, death: 1519, clan: 'hojo', role: '戦国大名の草分け', wiki: '北条早雲', fuzzy: true, desc: '伊勢盛時。伊豆・相模へ進出し、後北条氏の礎を築いた。生年は1432年説と1456年説がある。' },
  { id: 'hojo-ujitsuna', name: '北条氏綱', kana: 'ほうじょう うじつな', birth: 1487, death: 1541, clan: 'hojo', role: '後北条氏2代', wiki: '北条氏綱', desc: '早雲の子。北条に改姓し、武蔵へ領国を拡大した。' },
  { id: 'hojo-ujiyasu', name: '北条氏康', kana: 'ほうじょう うじやす', birth: 1515, death: 1571, clan: 'hojo', role: '後北条氏3代', wiki: '北条氏康', desc: '河越夜戦で関東管領らを破り、関東の覇者となった。武田・今川と三国同盟を結ぶ。' },
  { id: 'hojo-ujimasa', name: '北条氏政', kana: 'ほうじょう うじまさ', birth: 1538, death: 1590, clan: 'hojo', role: '後北条氏4代', wiki: '北条氏政', desc: '小田原征伐で豊臣秀吉に籠城したが降伏し、切腹した。' },

  // --- 今川 ---
  { id: 'imagawa-ujichika', name: '今川氏親', kana: 'いまがわ うじちか', birth: 1473, death: 1526, clan: 'imagawa', role: '駿河守護・戦国大名', wiki: '今川氏親', desc: '伯父の北条早雲の助けを得て家督を固め、遠江を斯波氏から奪った。分国法「今川仮名目録」を制定。' },
  { id: 'imagawa-yoshimoto', name: '今川義元', kana: 'いまがわ よしもと', birth: 1519, death: 1560, clan: 'imagawa', role: '駿河・遠江・三河の戦国大名', wiki: '今川義元', desc: '東海道に勢力を広げたが、1560年の桶狭間の戦いで織田信長の奇襲により討たれた。' },
  { id: 'imagawa-ujizane', name: '今川氏真', kana: 'いまがわ うじざね', birth: 1538, death: 1615, clan: 'imagawa', role: '今川義元の子', wiki: '今川氏真', desc: '義元の戦死後に家督を継いだが、武田・徳川の侵攻で1568年に大名としての地位を失った。のち家康に庇護された。' },

  // --- 毛利・大内・尼子 ---
  { id: 'mori-motonari', name: '毛利元就', kana: 'もうり もとなり', birth: 1497, death: 1571, clan: 'mori', role: '安芸の国人から中国の覇者へ', wiki: '毛利元就', desc: '厳島の戦いで陶晴賢を破り、大内氏・尼子氏を滅ぼして中国地方を制した。「三本の矢」の教えで知られるが、これは後世の逸話とされる。' },
  { id: 'mori-terumoto', name: '毛利輝元', kana: 'もうり てるもと', birth: 1553, death: 1625, clan: 'mori', role: '毛利家当主・豊臣五大老', wiki: '毛利輝元', desc: '祖父元就の跡を継ぎ、織田家と争った後、豊臣政権で五大老に。関ヶ原では西軍の総大将となり、戦後は周防・長門に減封された。' },
  { id: 'kobayakawa-takakage', name: '小早川隆景', kana: 'こばやかわ たかかげ', birth: 1533, death: 1597, clan: 'mori', role: '毛利元就の三男', wiki: '小早川隆景', desc: '毛利両川の一人。水軍を率い、のち豊臣政権で五大老の一人となった。' },
  { id: 'kikkawa-motoharu', name: '吉川元春', kana: 'きっかわ もとはる', birth: 1530, death: 1586, clan: 'mori', role: '毛利元就の次男', wiki: '吉川元春', desc: '毛利両川の一人。山陰方面の指揮を任され、尼子氏との戦いなどで活躍した。' },
  { id: 'ouchi-yoshioki', name: '大内義興', kana: 'おおうち よしおき', birth: 1477, death: 1528, clan: 'ouchi', role: '周防・長門ほかの守護', wiki: '大内義興', desc: '前将軍足利義稙を奉じて上洛し、約10年間京都で幕府を支えた。' },
  { id: 'ouchi-yoshitaka', name: '大内義隆', kana: 'おおうち よしたか', birth: 1507, death: 1551, clan: 'ouchi', role: '周防山口の戦国大名', wiki: '大内義隆', desc: '西国の文化を栄えさせ、ザビエルに布教を許したが、1551年に家臣の陶晴賢の謀反（大寧寺の変）で自害した。' },
  { id: 'sue-harukata', name: '陶晴賢', kana: 'すえ はるかた', birth: 1521, death: 1555, clan: 'ouchi', role: '大内家の重臣', wiki: '陶晴賢', desc: '大寧寺の変で主君義隆を討って実権を握ったが、厳島の戦いで毛利元就に敗れて自害した。' },
  { id: 'amago-tsunehisa', name: '尼子経久', kana: 'あまご つねひさ', birth: 1458, death: 1541, clan: 'amago', role: '出雲の戦国大名', wiki: '尼子経久', desc: '月山富田城を奪還して出雲を平定し、山陰・山陽に勢力を広げた。' },
  { id: 'amago-haruhisa', name: '尼子晴久', kana: 'あまご はるひさ', birth: 1514, death: 1560, clan: 'amago', role: '尼子経久の孫', wiki: '尼子晴久', desc: '尼子氏の最盛期を担ったが、毛利氏の台頭と大内氏との戦いに苦しんだ。' },
  { id: 'yamanaka-shikanosuke', name: '山中鹿介', kana: 'やまなか しかのすけ', birth: 1545, death: 1578, clan: 'amago', role: '尼子再興軍の将', wiki: '山中幸盛', fuzzy: true, desc: '山中幸盛（鹿介）。尼子氏の再興を目指して毛利氏と戦い、上月城の戦いで捕らえられ殺された。' },

  // --- 九州 ---
  { id: 'shimazu-takahisa', name: '島津貴久', kana: 'しまづ たかひさ', birth: 1514, death: 1571, clan: 'shimazu', role: '薩摩の戦国大名', wiki: '島津貴久', desc: '分裂していた島津家を統一し、薩摩・大隅への支配を固めた。鉄砲伝来（1543）の頃の当主。' },
  { id: 'shimazu-yoshihisa', name: '島津義久', kana: 'しまづ よしひさ', birth: 1533, death: 1611, clan: 'shimazu', role: '島津家16代当主', wiki: '島津義久', desc: '耳川の戦いで大友氏を破り、九州統一に迫った。1587年に秀吉に降伏した。' },
  { id: 'shimazu-yoshihiro', name: '島津義弘', kana: 'しまづ よしひろ', birth: 1535, death: 1619, clan: 'shimazu', role: '義久の弟・猛将', wiki: '島津義弘', desc: '少数の兵で大軍を破る戦いぶりで知られた。関ヶ原では西軍に属し、敵中を突破して退いた（島津の退き口）。' },
  { id: 'otomo-sorin', name: '大友宗麟', kana: 'おおとも そうりん', birth: 1530, death: 1587, clan: 'otomo', role: '豊後の戦国大名', wiki: '大友義鎮', desc: '大友義鎮（出家名の宗麟）。北九州に版図を広げ、キリスト教を保護した。耳川の戦いで島津氏に敗れ、衰退する。' },
  { id: 'ryuzoji-takanobu', name: '龍造寺隆信', kana: 'りゅうぞうじ たかのぶ', birth: 1529, death: 1584, clan: 'ryuzoji', role: '肥前の戦国大名', wiki: '龍造寺隆信', desc: '「肥前の熊」と恐れられた。沖田畷の戦いで島津・有馬連合軍に敗れ、戦死した。' },
  { id: 'nabeshima-naoshige', name: '鍋島直茂', kana: 'なべしま なおしげ', birth: 1538, death: 1618, clan: 'ryuzoji', role: '龍造寺家臣・佐賀藩の祖', wiki: '鍋島直茂', desc: '隆信の死後に龍造寺家の実権を握り、のち佐賀藩の祖となった。' },

  // --- 四国・東北 ---
  { id: 'chosokabe-motochika', name: '長宗我部元親', kana: 'ちょうそかべ もとちか', birth: 1539, death: 1599, clan: 'chosokabe', role: '土佐の戦国大名', wiki: '長宗我部元親', desc: '土佐を統一して四国制覇に迫る。1585年に秀吉の四国攻めで降伏し、土佐一国の大名となった。' },
  { id: 'date-terumune', name: '伊達輝宗', kana: 'だて てるむね', birth: 1544, death: 1585, clan: 'date', role: '伊達家16代当主', wiki: '伊達輝宗', desc: '政宗の父。1584年に家督を譲ったのち、翌年に二本松義継に拉致され死去した。' },
  { id: 'date-masamune', name: '伊達政宗', kana: 'だて まさむね', birth: 1567, death: 1636, clan: 'date', role: '陸奥の戦国大名・仙台藩祖', wiki: '伊達政宗', desc: '「独眼竜」と称された。摺上原の戦いで蘆名氏を破るが、小田原参陣は遅れる。のち仙台藩62万石の主となった。' },
  { id: 'mogami-yoshiaki', name: '最上義光', kana: 'もがみ よしあき', birth: 1546, death: 1614, clan: 'mogami', role: '出羽の戦国大名', wiki: '最上義光', desc: '出羽の国人を従えて最上氏の最盛期を築いた。関ヶ原では東軍に付き、上杉軍の侵攻を防いだ。' },

  // --- 畿内・近江・越前・美濃 ---
  { id: 'miyoshi-nagayoshi', name: '三好長慶', kana: 'みよし ながよし', birth: 1522, death: 1564, clan: 'miyoshi', role: '畿内の実力者', wiki: '三好長慶', desc: '細川晴元を追って京都を掌握し、将軍を擁さずに畿内を支配した。「最初の天下人」とも評される。' },
  { id: 'matsunaga-hisahide', name: '松永久秀', kana: 'まつなが ひさひで', birth: 1508, death: 1577, clan: 'miyoshi', role: '三好家の家宰', wiki: '松永久秀', fuzzy: true, desc: '三好長慶に仕えて大和を支配。のち信長に従うが、二度反旗を翻して信貴山城で自害した。' },
  { id: 'saito-dosan', name: '斎藤道三', kana: 'さいとう どうさん', birth: 1494, death: 1556, clan: 'saito', role: '美濃の戦国大名', wiki: '斎藤道三', fuzzy: true, desc: '油売りから身を起こした「美濃の蝮」として有名だが、父子二代の事績が混同されているとの説が有力。娘の帰蝶は織田信長に嫁いだ。' },
  { id: 'saito-yoshitatsu', name: '斎藤義龍', kana: 'さいとう よしたつ', birth: 1527, death: 1561, clan: 'saito', role: '道三の子', wiki: '斎藤義龍', desc: '長良川の戦い（1556）で父道三を討った。' },
  { id: 'saito-tatsuoki', name: '斎藤龍興', kana: 'さいとう たつおき', birth: 1548, death: 1573, clan: 'saito', role: '斎藤家最後の当主', wiki: '斎藤龍興', desc: '1567年に信長に稲葉山城を落とされて美濃を追われ、のち朝倉氏に身を寄せ、刀根坂の戦いで戦死した。' },
  { id: 'asai-nagamasa', name: '浅井長政', kana: 'あざい ながまさ', birth: 1545, death: 1573, clan: 'asai', role: '北近江の戦国大名', wiki: '浅井長政', desc: '信長の妹お市の方を妻としたが、朝倉氏との関係から信長と対立。小谷城で自害した。' },
  { id: 'asakura-yoshikage', name: '朝倉義景', kana: 'あさくら よしかげ', birth: 1533, death: 1573, clan: 'asakura', role: '越前の戦国大名', wiki: '朝倉義景', desc: '足利義昭を一時保護したが上洛に動かず、信長に敗れ自害した。' },
  { id: 'rokkaku-yoshikata', name: '六角義賢', kana: 'ろっかく よしかた', birth: 1521, death: 1598, clan: 'rokkaku', role: '南近江の戦国大名', wiki: '六角義賢', desc: '承禎の名でも知られる。野良田の戦いで浅井長政に敗れ、信長の上洛の際に観音寺城を追われた。' },
  { id: 'kennyo', name: '顕如', kana: 'けんにょ', birth: 1543, death: 1592, clan: 'honganji', role: '本願寺11世', wiki: '顕如', desc: '石山合戦で10年にわたって信長と戦った。1580年に石山を退去し、のち秀吉から京都に寺地を与えられた。' },
];
