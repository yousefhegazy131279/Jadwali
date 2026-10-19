export type TourStep = {
  path: string
  selector: string
  titleEn?: string
  descriptionEn?: string
  categoryEn?: string
  title: string
  description: string
  /** مفتاح أيقونة يُفسَّر في TourOverlay */
  icon?: 'home' | 'sparkles' | 'calendar' | 'tasks' | 'folder' | 'users' | 'chart' | 'settings'
  /** الفئة القصيرة التي تظهر تحت الرقم */
  category?: string
  action: 'wait' | 'click' | 'input' | 'select'
  actionTarget?: string
  autoNextPath?: string
  autoNextPathPrefix?: string
  required?: boolean
  skipNavigation?: boolean
}

/**
 * جولة مفاهيمية تشرح كل مساحة في التطبيق خطوة بخطوة.
 */
export const tourSteps: TourStep[] = [
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-header"]',
    title: 'أهلاً بك في جَدْوَلِي',
    description:
      'لوحة التحكم الرئيسية. هنا ترى ملخص يومك: عدد الجداول، المهام المتبقية، الجلسات القادمة، والمؤقّت النشط. القائمة الجانبية تنقلك بين كل أقسام التطبيق.',
    icon: 'home',
    category: 'لوحة التحكم',
    action: 'wait',
  },
  {
    path: '/dashboard/planner',
    selector: 'h1',
    title: 'المخطط الذكي',
    description:
      'ابدأ من هنا. اكتب عنوان الجدول وتاريخه ووقت البدء، ثم أضف مهامك ومددها. يمكنك اختيار مشروع، ضبط مواقيت الصلاة، وتحديد إعدادات بومودورو — أو اسأل Jadwool أن يقترح لك جدولاً جاهزاً.',
    icon: 'sparkles',
    category: 'الخطوة الأولى',
    action: 'wait',
  },
  {
    path: '/dashboard/schedule',
    selector: 'h1',
    title: 'جداولك',
    description:
      'كل جداولك مرتّبة حسب التاريخ. افتح أي جدول لرؤية مراحله وصلواته وأعماله الجانبية، ثم ابدأ جلسة التركيز من المرحلة المناسبة.',
    icon: 'calendar',
    category: 'الجلسات',
    action: 'wait',
  },
  {
    path: '/dashboard/workspace',
    selector: 'h1',
    title: 'مساحة المهام',
    description:
      'جميع مهامك في مكان واحد. تابع المهام المكتملة والمتبقية ونظّم عملك — حتى لو لم تكن مرتبطة بجدول محدد.',
    icon: 'tasks',
    category: 'المهام',
    action: 'wait',
  },
  {
    path: '/dashboard/projects',
    selector: 'h1',
    title: 'المشاريع',
    description:
      'أنشئ مشروعاً لكل هدف أو مادة، ثم اربط به عدة جداول. سترى عدد الجداول، المهام، ونسبة الإنجاز لكل مشروع في لوحة واحدة.',
    icon: 'folder',
    category: 'التنظيم',
    action: 'wait',
  },
  {
    path: '/dashboard/shared',
    selector: 'h1',
    title: 'الجداول المشتركة',
    description:
      'شارك أي جدول مع صديق أو فريق. المشاهد يتابع فقط، والمحرر يستطيع إنجاز الجلسات. يظهر تقدّم كل عضو في بطاقة المساهمات.',
    icon: 'users',
    category: 'التعاون',
    action: 'wait',
  },
  {
    path: '/dashboard/analytics',
    selector: 'h1',
    title: 'الإحصائيات والأداء',
    description:
      'لوحة تحليلات شاملة: جلساتك، ساعات التركيز، الالتزام بالجداول، أداء المشاريع، وخريطة نشاط حرارية. بدّل بين العرض اليومي والأسبوعي بضغطة واحدة.',
    icon: 'chart',
    category: 'التحليلات',
    action: 'wait',
  },
  {
    path: '/dashboard/settings',
    selector: 'h1',
    title: 'الإعدادات والتخصيص',
    description:
      'احفظ اسمك، اضبط مواقيت الصلاة وإعدادات بومودورو، وبدّل اللغة والثيم. اضغط "حفظ التغييرات" لتفعيل إعداداتك على كل الجداول الجديدة.',
    icon: 'settings',
    category: 'التخصيص',
    action: 'wait',
  },
  ...[
    ['/dashboard/templates','ابدأ بقالب','Start with a template','اختر نمط يومك، عاين المهام، ثم خصص اليوم الأول أو أنشئ الخطة كاملة. قالب الامتحانات ينشئ سبعة أيام منفصلة.','Preview a routine, customize its first day or create the full plan. The exam template creates seven separate days.','calendar'],
    ['/dashboard/notes','أفكار مرتبطة بالخطة','Notes linked to your plan','أنشئ ملاحظة واختر لونها وثبت المهمة منها واربطها بجدول أو مشروع. يمكنك تعديلها دون اتصال ومراجعة المزامنة لاحقًا.','Create, color and pin notes, then link them to a schedule or project. Edit offline and review sync later.','tasks'],
    ['/dashboard/achievements','راقب تقدمك الحقيقي','See your real progress','الإنجازات والسلسلة تأتي من الجلسات المسجلة، لا من فتح الصفحة. كل إنجاز يوضح هدفه وتقدمك إليه.','Achievements and streaks come from recorded focus, not page visits. Each award shows its target and your progress.','chart'],
    ['/dashboard/challenges','تحدٍ مع أصدقائك','Challenge your friends','أنشئ تحديًا باسم ظاهر وكود خاص أو انضم بكود صديقك. لا تُحتسب إلا دقائق التركيز المسجلة بعد الانضمام وخلال مدة التحدي.','Create a private invitation or join a friend’s code. Only recorded focus after joining and during the challenge counts.','users'],
    ['/dashboard/rooms','جلسة جماعية','Focus together','أنشئ غرفة وشارك كودها. المضيف يبدأ المؤقت للجميع. انضم قبل الجولة ثم احفظ جلستك عند اكتمالها؛ الدردشة للتشجيع.','Create a room and share its code. The host starts the shared timer. Join before a phase and save your credit when it ends; use chat for encouragement.','users'],
    ['/dashboard/reports','راجع أسبوعك','Review your week','اختر أسبوعًا لترى الجلسات وساعات التركيز وأفضل يوم ونسبة إنجاز المهام. يمكنك تصدير التقرير أو طباعته. إرسال البريد مؤجل.','Choose a week to see focus, your best day and task completion. Export or print your report. Email delivery is deferred.','chart'],
    ['/dashboard/offline','العمل دون اتصال','Work offline','الصفحات المحملة والملاحظات والمسودات متاحة على الجهاز. راجع العمليات المعلقة والتعارضات هنا؛ إنشاء الجداول والذكاء الاصطناعي يحتاجان الإنترنت.','Loaded pages, notes and drafts remain on your device. Review queued changes and conflicts here; cloud creation and AI require a connection.','settings']
  ].map(([path,title,titleEn,description,descriptionEn,icon])=>({path,selector:'h1',title,titleEn,description,descriptionEn,icon:icon as TourStep['icon'],action:'wait' as const})),
]
