export type TourStep = {
  path: string
  selector: string
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
]