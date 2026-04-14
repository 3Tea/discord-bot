export const languages = {
  en: "English",
  vi: "Tiếng Việt",
} as const;

export const defaultLang = "en" as const;
export const showDefaultLang = false;

export const ui = {
  en: {
    // Meta
    "meta.home.title": "3AT - Endless Paradox | Discord Bot",
    "meta.description": "Discord bot for voice channel management, manga reading, translation, and more.",

    // Navigation
    "nav.features": "Features",
    "nav.commands": "Commands",
    "nav.guide": "Guide",
    "nav.faq": "FAQ",
    "nav.premium": "Premium",
    "nav.support": "Support",
    "nav.add": "Add to Server",

    // Hero
    "hero.subtitle": "A Discord bot packed with XP leveling, economy, voice management, manga reader, and 15-language support. Slash commands only, always up.",
    "hero.add": "Add to Server",
    "hero.commands": "View Commands",
    "hero.trust": "Free to use · Slash commands · Online since 2019",
    "hero.scroll": "Scroll to features",

    // Features section
    "features.label": "What it does",
    "features.title": "Everything you need, nothing you don't",
    "features.subtitle": "Powerful features built for Discord servers of all sizes.",
    "features.voice.title": "Voice Management",
    "features.voice.desc": "Create temporary voice channels with full control — lock, hide, permit, kick, transfer.",
    "features.xp.title": "XP & Leveling",
    "features.xp.desc": "Earn XP from messages, voice, and reactions. Track ranks, view canvas cards, and compete on leaderboards.",
    "features.economy.title": "Economy System",
    "features.economy.desc": "Coins, gems, daily prayers, streak rewards, and a server shop with purchasable roles and items.",
    "features.manga.title": "Manga Reader",
    "features.manga.desc": "Read from 6+ sources directly in Discord — nhentai, 3hentai, asmhentai, hentaifox & more.",
    "features.i18n.title": "Multi-Language",
    "features.i18n.desc": "Supports 15 languages — English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, and Dutch.",
    "features.utility.title": "Utility Tools",
    "features.utility.desc": "Weather, translation, avatar viewer, bot info — plus 100% slash commands with auto-complete.",

    // Commands showcase section
    "showcase.label": "Commands",
    "showcase.title": "See it in action",
    "showcase.subtitle": "Discord-native embed previews of real bot responses.",
    "showcase.cta": "View all commands →",

    // Voice demo section
    "voice.label": "Voice Management",
    "voice.title": "Your room, your rules",
    "voice.subtitle": "Temporary voice channels that create themselves and clean up after.",
    "voice.step1.title": "Join the trigger channel",
    "voice.step1.desc": "Any channel with a \"3AT \" prefix acts as a trigger. Just join it.",
    "voice.step2.title": "Bot auto-creates your room",
    "voice.step2.desc": "A private voice channel is instantly created just for you.",
    "voice.step3.title": "Use the control panel",
    "voice.step3.desc": "Lock, hide, permit, kick, rename — full control via slash commands.",
    "voice.step4.title": "Auto-cleanup when empty",
    "voice.step4.desc": "When everyone leaves, the channel is deleted automatically.",

    // Stats
    "stats.servers": "Servers",
    "stats.users": "Users",
    "stats.uptime": "Uptime",
    "stats.since": "Since",

    // Testimonials
    "testimonials.label": "Community",
    "testimonials.title": "What we hear from servers",
    "testimonials.subtitle": "Short notes in the spirit of real tickets and DMs — common themes, not paid quotes.",

    // FAQ section
    "faq.label": "FAQ",
    "faq.title": "Common questions",
    "faq.subtitle": "Quick answers to the questions we hear most often.",
    "faq.xp.q": "How does the XP and leveling system work?",
    "faq.xp.a": "Members earn XP from messages, voice activity, and reactions. XP is tracked per server with configurable rates. Use /rank to view your level card, /leaderboard for rankings (with daily, weekly, monthly filters), and /server-rank to see your server's stats. Admins can configure XP rates and blacklist channels via /xp commands.",
    "faq.voice.q": "How do I set up temporary voice channels?",
    "faq.voice.a": "Create a voice channel with \"3AT \" prefix (e.g., \"3AT Create Room\"). When users join it, the bot automatically creates a personal channel for them. No additional configuration needed.",
    "faq.economy.q": "What is the economy system?",
    "faq.economy.a": "Each server has its own economy with coins and gems. Use /pray daily to earn coins (with streak bonuses at 3, 7, 14, and 30 days). Check your balance with /balance, and browse the server shop with /shop. Admins can manage currency with /economy commands.",
    "faq.lang.q": "What languages are supported?",
    "faq.lang.a": "The bot supports 15 languages: English, Vietnamese, Indonesian, Spanish, Japanese, Chinese, Korean, Portuguese (Brazil), French, German, Russian, Turkish, Italian, Polish, and Dutch. Set your personal language with /settings language, or set a server default with /settings server-language. The bot auto-detects your Discord client language as a fallback.",
    "faq.nsfw.q": "Is the manga reader NSFW only?",
    "faq.nsfw.a": "Yes. All manga commands require an NSFW-enabled channel. The bot checks the channel setting before responding and will show an error if the channel is not marked as NSFW.",
    "faq.perms.q": "What permissions does the bot need?",
    "faq.perms.a": "Administrator permission is recommended for full functionality. At minimum, the bot needs: Manage Channels (voice management), Send Messages, Embed Links, Attach Files (rank cards), and Connect + Move Members (voice features).",
    "faq.bug.q": "How do I report a bug or request a feature?",
    "faq.bug.a": "Open an issue on our GitHub repository or start a discussion in GitHub Discussions. You can also reach us through the Support server link in the navbar.",

    // Footer
    "footer.desc": "Discord bot for voice management, manga reading & more. Running since 2019.",
    "footer.links": "Links",
    "footer.resources": "Resources",
    "footer.legal": "Legal",
    "footer.add": "Add to Server",
    "footer.commands": "Commands",
    "footer.support": "Support Server",
    "footer.github": "GitHub",
    "footer.docs": "Documentation",
    "footer.bug": "Report Bug",
    "footer.discussions": "Discussions",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",

    // Commands page
    "commands.title": "All Commands",
    "commands.available": "commands available",
    "commands.search": "Search commands...",
    "commands.back": "← Back to Commands",
    "commands.guide": "Guide →",
    "commands.categories": "Categories",
    "commands.search.label": "Search",
    "commands.category.voice": "Voice",
    "commands.category.xp": "XP & Leveling",
    "commands.category.economy": "Economy",
    "commands.category.moderation": "Moderation",
    "commands.category.manga": "Manga",
    "commands.category.utility": "Utility",
    "commands.category.info": "Info",
    "commands.category.settings": "Settings",
    "commands.category.confession": "Confession",

    // Guide page
    "guide.section": "User Guide",
    "guide.title": "Everything you need to know about 3AT",
    "guide.subtitle": "Guides for every system — whether you're a member looking to earn coins or an admin setting up your server.",
    "guide.back": "← Back to Guide",
    "guide.related": "Related Commands",
    "guide.related.guides": "Related Guides",
    "guide.read": "Read guide →",
    "guide.toc": "On this page",

    // Legal
    "legal.lastUpdated": "Last updated",

    // Shared
    "breadcrumb.aria": "Breadcrumb",
    "translation.notice": "Translation is being updated. Content is currently displayed in English.",
  },
  vi: {
    // Meta
    "meta.home.title": "3AT - Endless Paradox | Bot Discord",
    "meta.description": "Bot Discord quản lý kênh voice, đọc manga, dịch thuật và nhiều tính năng khác.",

    // Navigation
    "nav.features": "Tính năng",
    "nav.commands": "Lệnh",
    "nav.guide": "Hướng dẫn",
    "nav.faq": "Câu hỏi",
    "nav.premium": "Premium",
    "nav.support": "Hỗ trợ",
    "nav.add": "Thêm vào Server",

    // Hero
    "hero.subtitle": "Bot Discord với hệ thống XP, kinh tế, quản lý voice, đọc manga, hỗ trợ 15 ngôn ngữ. Chỉ dùng slash commands, luôn hoạt động.",
    "hero.add": "Thêm vào Server",
    "hero.commands": "Xem lệnh",
    "hero.trust": "Miễn phí · Slash commands · Hoạt động từ 2019",
    "hero.scroll": "Cuộn xuống phần tính năng",

    // Features section
    "features.label": "Tính năng",
    "features.title": "Tất cả những gì bạn cần, không gì thừa",
    "features.subtitle": "Các tính năng mạnh mẽ cho mọi server Discord.",
    "features.voice.title": "Quản lý Voice",
    "features.voice.desc": "Tạo kênh voice tạm thời với đầy đủ quyền — khóa, ẩn, cấp phép, kick, chuyển quyền.",
    "features.xp.title": "XP & Cấp độ",
    "features.xp.desc": "Nhận XP từ tin nhắn, voice và reaction. Xem rank card, bảng xếp hạng theo ngày/tuần/tháng.",
    "features.economy.title": "Hệ thống Kinh tế",
    "features.economy.desc": "Coin, gem, cầu nguyện hàng ngày, phần thưởng streak, và cửa hàng server với role và vật phẩm.",
    "features.manga.title": "Đọc Manga",
    "features.manga.desc": "Đọc từ 6+ nguồn trực tiếp trên Discord — nhentai, 3hentai, asmhentai, hentaifox & nhiều hơn.",
    "features.i18n.title": "Đa ngôn ngữ",
    "features.i18n.desc": "Hỗ trợ 15 ngôn ngữ — Tiếng Anh, Tiếng Việt, Indonesia, Tây Ban Nha, Nhật, Trung, Hàn, Bồ Đào Nha (Brazil), Pháp, Đức, Nga, Thổ Nhĩ Kỳ, Ý, Ba Lan và Hà Lan.",
    "features.utility.title": "Tiện ích",
    "features.utility.desc": "Thời tiết, dịch thuật, xem avatar, thông tin bot — cùng 100% slash commands với auto-complete.",

    // Commands showcase section
    "showcase.label": "Lệnh",
    "showcase.title": "Xem thực tế",
    "showcase.subtitle": "Xem trước embed Discord của các phản hồi từ bot.",
    "showcase.cta": "Xem tất cả lệnh →",

    // Voice demo section
    "voice.label": "Quản lý Voice",
    "voice.title": "Phòng của bạn, luật của bạn",
    "voice.subtitle": "Kênh voice tạm thời tự tạo và tự dọn dẹp.",
    "voice.step1.title": "Tham gia kênh trigger",
    "voice.step1.desc": "Bất kỳ kênh nào có tiền tố \"3AT \" đều là trigger. Chỉ cần tham gia.",
    "voice.step2.title": "Bot tự tạo phòng cho bạn",
    "voice.step2.desc": "Kênh voice riêng được tạo ngay lập tức cho bạn.",
    "voice.step3.title": "Sử dụng bảng điều khiển",
    "voice.step3.desc": "Khóa, ẩn, cấp phép, kick, đổi tên — toàn quyền qua slash commands.",
    "voice.step4.title": "Tự dọn dẹp khi trống",
    "voice.step4.desc": "Khi mọi người rời đi, kênh sẽ tự động xóa.",

    // Stats
    "stats.servers": "Servers",
    "stats.users": "Người dùng",
    "stats.uptime": "Uptime",
    "stats.since": "Từ năm",

    // Testimonials
    "testimonials.label": "Cộng đồng",
    "testimonials.title": "Phản hồi từ các server",
    "testimonials.subtitle": "Ghi chú ngắn theo tinh thần của các ticket và DM thực tế — chủ đề phổ biến, không phải đánh giá trả phí.",

    // FAQ section
    "faq.label": "Câu hỏi",
    "faq.title": "Câu hỏi thường gặp",
    "faq.subtitle": "Câu trả lời nhanh cho các câu hỏi phổ biến nhất.",
    "faq.xp.q": "Hệ thống XP và cấp độ hoạt động như thế nào?",
    "faq.xp.a": "Thành viên nhận XP từ tin nhắn, hoạt động voice và reaction. XP được tính theo từng server với tỉ lệ có thể tùy chỉnh. Dùng /rank để xem rank card, /leaderboard để xem bảng xếp hạng (theo ngày, tuần, tháng), và /server-rank để xem thống kê server. Admin có thể cấu hình tỉ lệ XP qua lệnh /xp.",
    "faq.voice.q": "Làm sao để thiết lập kênh voice tạm thời?",
    "faq.voice.a": "Tạo kênh voice có tiền tố \"3AT \" (ví dụ: \"3AT Create Room\"). Khi người dùng tham gia, bot tự động tạo kênh riêng cho họ. Không cần cấu hình thêm.",
    "faq.economy.q": "Hệ thống kinh tế là gì?",
    "faq.economy.a": "Mỗi server có kinh tế riêng với coin và gem. Dùng /pray mỗi ngày để nhận coin (có thưởng streak ở ngày 3, 7, 14, 30). Kiểm tra số dư với /balance, và xem cửa hàng với /shop. Admin quản lý tiền tệ qua lệnh /economy.",
    "faq.lang.q": "Hỗ trợ những ngôn ngữ nào?",
    "faq.lang.a": "Bot hỗ trợ 15 ngôn ngữ: Tiếng Anh, Tiếng Việt, Indonesia, Tây Ban Nha, Nhật, Trung, Hàn, Bồ Đào Nha (Brazil), Pháp, Đức, Nga, Thổ Nhĩ Kỳ, Ý, Ba Lan và Hà Lan. Đặt ngôn ngữ cá nhân với /settings language, hoặc mặc định server với /settings server-language. Bot tự động phát hiện ngôn ngữ Discord client của bạn làm fallback.",
    "faq.nsfw.q": "Manga reader chỉ dùng cho NSFW?",
    "faq.nsfw.a": "Đúng. Tất cả lệnh manga yêu cầu kênh NSFW. Bot kiểm tra cài đặt kênh trước khi phản hồi và báo lỗi nếu kênh chưa được đánh dấu NSFW.",
    "faq.perms.q": "Bot cần những quyền gì?",
    "faq.perms.a": "Quyền Administrator được khuyến nghị. Tối thiểu cần: Manage Channels (quản lý voice), Send Messages, Embed Links, Attach Files (rank card), và Connect + Move Members (tính năng voice).",
    "faq.bug.q": "Làm sao báo lỗi hoặc yêu cầu tính năng?",
    "faq.bug.a": "Mở issue trên GitHub hoặc tạo thảo luận trong GitHub Discussions. Bạn cũng có thể liên hệ qua link Support trên thanh điều hướng.",

    // Footer
    "footer.desc": "Bot Discord quản lý voice, đọc manga & nhiều tính năng khác. Hoạt động từ 2019.",
    "footer.links": "Liên kết",
    "footer.resources": "Tài nguyên",
    "footer.legal": "Pháp lý",
    "footer.add": "Thêm vào Server",
    "footer.commands": "Lệnh",
    "footer.support": "Server Hỗ trợ",
    "footer.github": "GitHub",
    "footer.docs": "Tài liệu",
    "footer.bug": "Báo lỗi",
    "footer.discussions": "Thảo luận",
    "footer.privacy": "Chính sách Bảo mật",
    "footer.terms": "Điều khoản Dịch vụ",

    // Commands page
    "commands.title": "Tất cả Lệnh",
    "commands.available": "lệnh khả dụng",
    "commands.search": "Tìm lệnh...",
    "commands.back": "← Quay lại Lệnh",
    "commands.guide": "Hướng dẫn →",
    "commands.categories": "Danh mục",
    "commands.search.label": "Tìm kiếm",
    "commands.category.voice": "Voice",
    "commands.category.xp": "XP & Cấp độ",
    "commands.category.economy": "Kinh tế",
    "commands.category.moderation": "Kiểm duyệt",
    "commands.category.manga": "Manga",
    "commands.category.utility": "Tiện ích",
    "commands.category.info": "Thông tin",
    "commands.category.settings": "Cài đặt",
    "commands.category.confession": "Tâm sự",

    // Guide page
    "guide.section": "Hướng dẫn",
    "guide.title": "Mọi thứ bạn cần biết về 3AT",
    "guide.subtitle": "Hướng dẫn cho mọi hệ thống — dù bạn là thành viên muốn kiếm coin hay admin thiết lập server.",
    "guide.back": "← Quay lại Hướng dẫn",
    "guide.related": "Lệnh liên quan",
    "guide.related.guides": "Hướng dẫn liên quan",
    "guide.read": "Đọc hướng dẫn →",
    "guide.toc": "Mục lục trang",

    // Legal
    "legal.lastUpdated": "Cập nhật lần cuối",

    // Shared
    "breadcrumb.aria": "Điều hướng đường dẫn",
    "translation.notice": "Bản dịch đang được cập nhật. Nội dung hiện tại hiển thị bằng tiếng Anh.",
  },
} as const;
