export const UI_LANGUAGES = { auto: "System", en: "English", zh: "简体中文", es: "Español", fr: "Français", de: "Deutsch", ja: "日本語", ko: "한국어", pt: "Português", ru: "Русский", ar: "العربية" };
export type Locale = Exclude<keyof typeof UI_LANGUAGES, "auto">;
export type LanguageSetting = keyof typeof UI_LANGUAGES;
const ORDER: Locale[] = ["en", "es", "fr", "de", "ja", "ko", "pt", "ru", "ar"];

// Source labels stay readable in the native view. Missing translations fall back to English.
const ROWS: Record<string, string> = {
  "乔木电台": "Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio|Qiaomu Radio",
  "推荐": "For you|Para ti|Pour vous|Für dich|おすすめ|추천|Para você|Для вас|لك",
  "专注": "Focus|Concentración|Concentration|Fokus|集中|집중|Foco|Фокус|تركيز",
  "松弛": "Unwind|Relajarse|Détente|Entspannen|リラックス|휴식|Relaxar|Отдых|استرخاء",
  "浏览": "Browse|Explorar|Explorer|Entdecken|探す|둘러보기|Explorar|Обзор|تصفح",
  "浏览电台": "Browse stations|Explorar emisoras|Explorer les stations|Sender entdecken|ラジオを探す|방송국 둘러보기|Explorar estações|Обзор станций|تصفح المحطات",
  "喜欢": "Favorites|Favoritos|Favoris|Favoriten|お気に入り|즐겨찾기|Favoritos|Избранное|المفضلة",
  "最近": "Recent|Recientes|Récentes|Zuletzt|最近|최근|Recentes|Недавние|الأخيرة",
  "原版": "Classic|Clásico|Classique|Klassisch|クラシック|클래식|Clássico|Классический|كلاسيكي",
  "返回原版": "Classic view|Vista clásica|Vue classique|Klassische Ansicht|クラシックに戻る|클래식으로|Vista clássica|Классический вид|العرض الكلاسيكي",
  "正在播放": "Now playing|Reproduciendo|À l’écoute|Aktuelle Wiedergabe|再生中|지금 재생 중|Em reprodução|Сейчас играет|قيد التشغيل",
  "正在直播": "Live|En directo|En direct|Live|ライブ|라이브|Ao vivo|В эфире|مباشر",
  "已暂停": "Paused|En pausa|En pause|Pausiert|一時停止|일시 정지|Pausado|На паузе|متوقف مؤقتًا",
  "播放": "Play|Reproducir|Lire|Wiedergabe|再生|재생|Reproduzir|Воспроизвести|تشغيل",
  "暂停": "Pause|Pausar|Pause|Pause|一時停止|일시 정지|Pausar|Пауза|إيقاف مؤقت",
  "播放或暂停": "Play or pause|Reproducir o pausar|Lire ou mettre en pause|Wiedergabe oder Pause|再生・一時停止|재생 또는 일시 정지|Reproduzir ou pausar|Воспроизвести или приостановить|تشغيل أو إيقاف مؤقت",
  "上一家电台": "Previous station|Emisora anterior|Station précédente|Vorheriger Sender|前の局|이전 방송국|Estação anterior|Предыдущая станция|المحطة السابقة",
  "下一家电台": "Next station|Siguiente emisora|Station suivante|Nächster Sender|次の局|다음 방송국|Próxima estação|Следующая станция|المحطة التالية",
  "音量": "Volume|Volumen|Volume|Lautstärke|音量|음량|Volume|Громкость|مستوى الصوت",
  "搜索电台": "Search stations|Buscar emisoras|Rechercher des stations|Sender suchen|ラジオを検索|방송국 검색|Buscar estações|Поиск станций|البحث عن محطات",
  "搜索": "Search|Buscar|Rechercher|Suchen|検索|검색|Buscar|Поиск|بحث",
  "搜索全球": "Search worldwide|Buscar en todo el mundo|Recherche mondiale|Weltweit suchen|世界中を検索|전 세계 검색|Buscar no mundo|Поиск по миру|بحث عالمي",
  "筛选当前列表，回车搜索全球": "Filter this list, Enter to search worldwide|Filtrar lista; Intro para buscar globalmente|Filtrer la liste, Entrée pour chercher partout|Liste filtern, Enter für weltweite Suche|リストを絞り込み、Enterで全世界を検索|목록 필터, Enter로 전 세계 검색|Filtrar lista, Enter para busca global|Фильтр списка, Enter — поиск по миру|تصفية القائمة، Enter للبحث عالميًا",
  "频道": "Channels|Canales|Chaînes|Kanäle|チャンネル|채널|Canais|Каналы|القنوات",
  "电台列表": "Stations|Emisoras|Stations|Sender|ラジオ一覧|방송국|Estações|Станции|المحطات",
  "返回菜单": "Back to menu|Volver al menú|Retour au menu|Zurück zum Menü|メニューに戻る|메뉴로 돌아가기|Voltar ao menu|Назад в меню|العودة للقائمة",
  "音乐": "Music|Música|Musique|Musik|音楽|음악|Música|Музыка|موسيقى",
  "内容": "Spoken audio|Contenido hablado|Parole|Wortprogramme|トーク・情報|토크·정보|Conteúdo falado|Разговорное радио|محتوى منطوق",
  "声音": "Soundscapes|Paisajes sonoros|Ambiances|Klangwelten|サウンドスケープ|사운드스케이프|Paisagens sonoras|Звуковые пейзажи|مشاهد صوتية",
  "爵士": "Jazz|Jazz|Jazz|Jazz|ジャズ|재즈|Jazz|Джаз|جاز",
  "古典": "Classical|Clásica|Classique|Klassik|クラシック|클래식|Clássica|Классика|كلاسيكية",
  "电子": "Electronic|Electrónica|Électronique|Elektronik|エレクトロニック|일렉트로닉|Eletrônica|Электроника|إلكترونية",
  "摇滚": "Rock|Rock|Rock|Rock|ロック|록|Rock|Рок|روك",
  "流行": "Pop|Pop|Pop|Pop|ポップ|팝|Pop|Поп|بوب",
  "民谣": "Folk|Folk|Folk|Folk|フォーク|포크|Folk|Фолк|فولك",
  "世界音乐": "World music|Músicas del mundo|Musiques du monde|Weltmusik|ワールドミュージック|월드 뮤직|Música do mundo|Музыка мира|موسيقى عالمية",
  "新闻": "News|Noticias|Actualités|Nachrichten|ニュース|뉴스|Notícias|Новости|أخبار",
  "谈话": "Talk|Charlas|Débats|Talk|トーク|토크|Conversas|Разговоры|حوارات",
  "体育": "Sports|Deportes|Sport|Sport|スポーツ|스포츠|Esportes|Спорт|رياضة",
  "文化": "Culture|Cultura|Culture|Kultur|文化|문화|Cultura|Культура|ثقافة",
  "自然声音": "Nature|Naturaleza|Nature|Natur|自然の音|자연의 소리|Natureza|Природа|أصوات الطبيعة",
  "环境氛围": "Ambient|Ambiental|Ambient|Ambient|アンビエント|앰비언트|Ambiente|Эмбиент|أجواء محيطة",
  "冥想": "Meditation|Meditación|Méditation|Meditation|瞑想|명상|Meditação|Медитация|تأمل",
  "语言": "Language|Idioma|Langue|Sprache|言語|언어|Idioma|Язык|اللغة",
  "地区": "Region|Región|Région|Region|地域|지역|Região|Регион|المنطقة",
  "全部语言": "Any language|Cualquier idioma|Toutes les langues|Alle Sprachen|すべての言語|모든 언어|Todos os idiomas|Любой язык|كل اللغات",
  "全部地区": "Any region|Cualquier región|Toutes les régions|Alle Regionen|すべての地域|모든 지역|Todas as regiões|Любой регион|كل المناطق",
  "清除筛选": "Reset filters|Restablecer filtros|Réinitialiser les filtres|Filter zurücksetzen|絞り込みをリセット|필터 초기화|Redefinir filtros|Сбросить фильтры|إعادة ضبط الفلاتر",
  "关闭分类": "Close browser|Cerrar explorador|Fermer|Schließen|閉じる|닫기|Fechar|Закрыть|إغلاق",
  "语言与地区": "Language & region|Idioma y región|Langue et région|Sprache und Region|言語と地域|언어 및 지역|Idioma e região|Язык и регион|اللغة والمنطقة",
  "查看电台": "Show stations|Ver emisoras|Voir les stations|Sender anzeigen|ラジオを表示|방송국 보기|Ver estações|Показать станции|عرض المحطات",
  "界面语言": "Interface language|Idioma de la interfaz|Langue de l’interface|Oberflächensprache|表示言語|화면 언어|Idioma da interface|Язык интерфейса|لغة الواجهة",
  "跟随系统": "Follow system|Seguir sistema|Suivre le système|Systemsprache|システムに従う|시스템 설정|Seguir sistema|Как в системе|اتباع النظام",
  "默认频道": "Default channel|Canal predeterminado|Chaîne par défaut|Standardkanal|既定のチャンネル|기본 채널|Canal padrão|Канал по умолчанию|القناة الافتراضية",
  "默认播放器": "Default player|Reproductor predeterminado|Lecteur par défaut|Standard-Player|既定のプレーヤー|기본 플레이어|Reprodutor padrão|Плеер по умолчанию|المشغل الافتراضي",
  "默认音量": "Default volume|Volumen predeterminado|Volume par défaut|Standardlautstärke|既定の音量|기본 음량|Volume padrão|Громкость по умолчанию|الصوت الافتراضي",
  "关于": "About|Acerca de|À propos|Über|このプラグインについて|정보|Sobre|О плагине|حول",
  "选一家电台": "Choose a station|Elige una emisora|Choisir une station|Sender auswählen|ラジオを選択|방송국 선택|Escolha uma estação|Выберите станцию|اختر محطة",
  "正在获取电台…": "Loading stations…|Cargando emisoras…|Chargement des stations…|Sender werden geladen…|ラジオを取得中…|방송국 불러오는 중…|Carregando estações…|Загрузка станций…|جارٍ تحميل المحطات…",
  "没有找到可用电台。": "No stations match. Try another filter.|No hay emisoras. Prueba otro filtro.|Aucune station. Essayez un autre filtre.|Keine Sender. Anderen Filter versuchen.|該当する局がありません。条件を変えてください。|방송국이 없습니다. 다른 필터를 선택하세요.|Nenhuma estação. Tente outro filtro.|Нет станций. Измените фильтр.|لا توجد محطات. جرّب فلترًا آخر.",
  "重新连接": "Retry|Reintentar|Réessayer|Erneut versuchen|再試行|다시 시도|Tentar novamente|Повторить|إعادة المحاولة",
  "加入喜欢": "Add to favorites|Añadir a favoritos|Ajouter aux favoris|Zu Favoriten|お気に入りに追加|즐겨찾기 추가|Adicionar aos favoritos|В избранное|إضافة للمفضلة",
  "取消喜欢": "Remove favorite|Quitar favorito|Retirer des favoris|Favorit entfernen|お気に入りから削除|즐겨찾기 해제|Remover favorito|Убрать из избранного|إزالة من المفضلة",
  "已喜欢": "Favorited|Favorito|Dans les favoris|Favorisiert|お気に入り|즐겨찾기 추가됨|Favoritado|В избранном|في المفضلة",
  "版本": "Version|Versión|Version|Version|バージョン|버전|Versão|Версия|الإصدار",
  "每次新开电台页时首先显示的频道。": "Channel shown in a new radio tab.|Canal al abrir una pestaña.|Chaîne affichée dans un nouvel onglet.|Kanal in einem neuen Radio-Tab.|新しいラジオタブに表示するチャンネル。|새 라디오 탭에 표시할 채널입니다.|Canal exibido em uma nova aba.|Канал в новой вкладке радио.|القناة المعروضة في علامة تبويب جديدة.",
  "播放器主题会保存在当前 Vault。": "Appearance is saved in this vault.|La apariencia se guarda en esta bóveda.|L’apparence est enregistrée dans ce coffre.|Das Design wird in diesem Vault gespeichert.|外観はこの保管庫に保存されます。|모양은 현재 보관함에 저장됩니다.|A aparência é salva neste cofre.|Оформление сохраняется в этом хранилище.|يُحفظ المظهر في هذا الخزنة.",
  "音量调整会立即保存。": "Volume changes save immediately.|El volumen se guarda al instante.|Le volume est enregistré immédiatement.|Lautstärke wird sofort gespeichert.|音量の変更はすぐに保存されます。|음량 변경은 즉시 저장됩니다.|O volume é salvo imediatamente.|Громкость сохраняется сразу.|تُحفظ تغييرات الصوت فورًا.",
  "电台目录来自 Radio Browser，播放偏好只保存在当前 Vault 的插件数据中。": "Directory by Radio Browser. Preferences stay in this vault.|Directorio de Radio Browser. Preferencias guardadas en esta bóveda.|Annuaire Radio Browser. Préférences conservées dans ce coffre.|Verzeichnis von Radio Browser. Einstellungen bleiben in diesem Vault.|電台一覧はRadio Browser提供。設定はこの保管庫のみに保存されます。|방송국 목록은 Radio Browser 제공. 설정은 이 보관함에만 저장됩니다.|Diretório do Radio Browser. Preferências ficam neste cofre.|Каталог Radio Browser. Настройки остаются в этом хранилище.|الدليل من Radio Browser. تبقى التفضيلات في هذه الخزنة.",
  "在线电台": "Web player|Reproductor web|Lecteur web|Web-Player|ウェブプレーヤー|웹 플레이어|Reprodutor web|Веб-плеер|مشغل الويب",
  "还没有喜欢的电台": "No favorites yet|Aún no hay favoritos|Aucun favori|Noch keine Favoriten|お気に入りはまだありません|즐겨찾기가 없습니다|Ainda sem favoritos|Пока нет избранного|لا توجد مفضلة بعد",
  "还没有收听记录": "No listening history yet|Aún no hay historial|Aucun historique|Noch kein Verlauf|再生履歴はまだありません|재생 기록이 없습니다|Ainda sem histórico|История пока пуста|لا يوجد سجل استماع بعد",
  "正在连接直播…": "Connecting…|Conectando…|Connexion…|Verbindung wird hergestellt…|接続中…|연결 중…|Conectando…|Подключение…|جارٍ الاتصال…",
  "连接失败，点按重试": "Connection failed. Tap to retry.|Error de conexión. Toca para reintentar.|Connexion échouée. Réessayez.|Verbindung fehlgeschlagen. Erneut versuchen.|接続できません。タップして再試行。|연결 실패. 눌러서 다시 시도하세요.|Falha na conexão. Toque para tentar.|Нет соединения. Нажмите для повтора.|فشل الاتصال. اضغط للمحاولة مجددًا.",
  "电台名称或城市": "Station name or city|Emisora o ciudad|Station ou ville|Sender oder Stadt|局名または都市|방송국 이름 또는 도시|Estação ou cidade|Станция или город|اسم المحطة أو المدينة",
  "点亮红心的电台会留在这里。": "Your favorite stations appear here.|Tus emisoras favoritas aparecen aquí.|Vos stations favorites s’affichent ici.|Deine Lieblingssender erscheinen hier.|お気に入りの局がここに表示されます。|즐겨찾는 방송국이 여기에 표시됩니다.|Suas estações favoritas aparecem aqui.|Здесь появятся избранные станции.|تظهر محطاتك المفضلة هنا.",
  "播放过的电台会按最近顺序出现。": "Recently played stations appear here.|Aquí aparecen las emisoras recientes.|Vos stations récentes s’affichent ici.|Zuletzt gehörte Sender erscheinen hier.|最近再生した局が表示されます。|최근 재생한 방송국이 표시됩니다.|Estações recentes aparecem aqui.|Здесь появятся недавние станции.|تظهر المحطات الأخيرة هنا.",
  "暂时联系不上电台目录。": "Cannot reach the directory. Retry.|No se puede acceder al directorio. Reintenta.|Annuaire inaccessible. Réessayez.|Verzeichnis nicht erreichbar. Erneut versuchen.|一覧に接続できません。再試行してください。|목록에 연결할 수 없습니다. 다시 시도하세요.|Diretório indisponível. Tente novamente.|Каталог недоступен. Повторите.|الدليل غير متاح. أعد المحاولة.",
  "当前列表没有匹配项，按回车搜索全球目录。": "No matches. Press Enter to search worldwide.|Sin resultados. Intro para buscar globalmente.|Aucun résultat. Entrée pour chercher partout.|Keine Treffer. Enter für weltweite Suche.|該当なし。Enterで世界中を検索。|결과 없음. Enter로 전 세계 검색.|Sem resultados. Enter para busca global.|Нет совпадений. Enter для поиска по миру.|لا نتائج. Enter للبحث عالميًا.",
  "请点击播放按钮开始收听。": "Press Play to start listening.|Pulsa reproducir para escuchar.|Appuyez sur Lecture pour écouter.|Zum Hören auf Wiedergabe drücken.|再生ボタンで聴き始めます。|재생 버튼을 눌러 들어보세요.|Pressione Reproduzir para ouvir.|Нажмите воспроизведение для прослушивания.|اضغط تشغيل للاستماع.",
  "这家电台暂时无法播放。": "This station is unavailable.|Esta emisora no está disponible.|Cette station est indisponible.|Dieser Sender ist nicht verfügbar.|この局は現在再生できません。|현재 재생할 수 없는 방송국입니다.|Esta estação está indisponível.|Эта станция недоступна.|هذه المحطة غير متاحة.",
  "还没有播放电台": "Nothing playing yet|Nada en reproducción|Aucune lecture en cours|Noch keine Wiedergabe|まだ再生していません|재생 중인 방송국 없음|Nada em reprodução|Ничего не играет|لا شيء قيد التشغيل",
  "选择一家电台开始收听": "Choose a station to listen|Elige una emisora|Choisissez une station|Sender zum Hören auswählen|局を選んで聴く|방송국을 선택해 들어보세요|Escolha uma estação|Выберите станцию|اختر محطة للاستماع",
  "全球": "Worldwide|Mundial|Monde|Weltweit|世界|전 세계|Mundo|Весь мир|حول العالم",
  "能量": "Energy|Energía|Énergie|Energie|エネルギー|에너지|Energia|Энергия|طاقة",
  "世界": "World|Mundo|Monde|Welt|世界|세계|Mundo|Мир|العالم",
};

const ALIASES: Record<string, string> = {
  "正在寻找信号…": "正在获取电台…", "为你推荐": "推荐", "从电台列表选择一家开始。": "选择一家电台开始收听",
  "暂时联系不上全球电台目录。": "暂时联系不上电台目录。", "暂时联系不上分类目录，请重试或切换分类。": "暂时联系不上电台目录。",
  "已取消喜欢": "取消喜欢", "已加入喜欢": "已喜欢",
};

const EN: Record<string, string> = {
  "能量": "Energy", "世界": "World", "为你推荐": "For you", "全球": "Worldwide", "全球直播电台": "Live radio worldwide",
  "不用离开笔记，听见世界。": "Tune into the world without leaving your notes.",
  "选择一家电台开始收听": "Choose a station to start listening", "还没有播放电台": "Nothing playing yet", "从电台列表选择一家开始。": "Choose a station from the list.",
  "正在寻找信号…": "Loading stations…", "正在连接直播…": "Connecting…", "电台名称或城市": "Station name or city", "连接失败，点按重试": "Connection failed. Tap to retry.",
  "还没有喜欢的电台": "No favorites yet", "还没有收听记录": "No listening history yet", "点亮红心的电台会留在这里。": "Stations you favorite will appear here.", "播放过的电台会按最近顺序出现。": "Your recently played stations will appear here.",
  "当前列表没有匹配项，按回车搜索全球目录。": "No matches in this list. Press Enter to search worldwide.",
  "暂时联系不上电台目录。": "Cannot reach the directory. Please retry.", "暂时联系不上全球电台目录。": "Cannot reach the directory. Please retry.", "暂时联系不上分类目录，请重试或切换分类。": "Cannot reach the category directory. Retry or choose another category.",
  "已切换到乔木电台的备用目录。": "Using the backup station directory.", "请点击播放按钮开始收听。": "Press Play to start listening.", "这家电台暂时无法播放。": "This station is unavailable.", "直播中断，正在尝试下一家。": "Stream interrupted. Trying the next station.",
  "这家电台暂时无法连接，正在尝试下一家。": "Station unavailable. Trying the next station.", "已取消喜欢": "Removed from favorites", "已加入喜欢": "Added to favorites",
  "继续听": "Keep listening", "暂停": "Pause", "播放": "Play", "正在播放": "Playing", "直播中": "Live", "喜欢的电台": "Favorite",
  "打开乔木电台": "Open Qiaomu Radio", "打开电台": "Open radio", "在线电台": "Web player",
  "每次新开电台页时首先显示的频道。": "The channel shown when opening a new radio tab.", "播放器主题会保存在当前 Vault。": "Player appearance is saved in this vault.", "音量调整会立即保存。": "Volume changes are saved immediately.",
  "电台目录来自 Radio Browser，播放偏好只保存在当前 Vault 的插件数据中。": "Directory by Radio Browser. Listening preferences stay in this vault.", "版本": "Version",
  "驰放": "Chillout", "休闲音乐": "Lounge", "器乐": "Instrumental", "轻音乐": "Easy listening", "灵魂乐": "Soul", "舞曲": "Dance", "放松音乐": "Relaxation", "放松": "Relax", "国际音乐": "International",
};

export function resolveLocale(setting: string = "auto", languages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages): Locale {
  if (setting !== "auto" && Object.prototype.hasOwnProperty.call(UI_LANGUAGES, setting)) return setting as Locale;
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (base !== "auto" && Object.prototype.hasOwnProperty.call(UI_LANGUAGES, base)) return base as Locale;
  }
  return "en";
}

export function translate(source: string, locale: Locale): string {
  if (locale === "zh") return source;
  source = ALIASES[source] || source;
  const row = ROWS[source]?.split("|");
  return row?.[ORDER.indexOf(locale)] || row?.[0] || EN[source] || source;
}

export function displayName(code: string, type: "region" | "language", locale: Locale, fallback: string): string {
  try {
    const Names = (Intl as unknown as { DisplayNames?: new (locales: string[], options: { type: string }) => { of(code: string): string | undefined } }).DisplayNames;
    return Names ? new Names([locale === "zh" ? "zh-CN" : locale], { type }).of(code) ?? fallback : fallback;
  } catch { return fallback; }
}
