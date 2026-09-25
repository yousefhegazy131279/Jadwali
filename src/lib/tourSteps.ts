export type TourStep = {
  path: string
  selector: string
  title: string
  description: string
  action: 'wait' | 'click' | 'input' | 'select'
  actionTarget?: string
  required?: boolean
  autoNextPath?: string // المسار الكامل الذي ننتقل بعده تلقائيًا
  autoNextPathPrefix?: string // بادئة المسار التي ننتقل بعدها تلقائيًا
  skipNavigation?: boolean // لا نقوم بتوجيه عند هذه الخطوة
}

export const tourSteps: TourStep[] = [
  // ========== لوحة التحكم ==========
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-header"]',
    title: 'مرحبًا بك في جَدْوَلِي!',
    description: 'هذه لوحة التحكم الرئيسية. اضغط "التالي" للمتابعة.',
    action: 'wait',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-stats"]',
    title: 'الإحصائيات',
    description: 'هذه البطاقات تعرض ملخص يومك. اضغط "التالي".',
    action: 'wait',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-timer"]',
    title: 'المؤقت الدائري',
    description: 'عند بدء جلسة من جدولك، سيظهر هنا مؤقت دائري. اضغط "التالي".',
    action: 'wait',
  },
  {
    path: '/dashboard',
    selector: '[data-tour="dashboard-schedules"]',
    title: 'الجداول',
    description: 'اضغط زر "أضف جدولاً جديداً".',
    action: 'click',
    actionTarget: 'button[data-tour="dashboard-add-schedule"]',
    required: true,
  },

  // ========== المخطط ==========
  {
    path: '/dashboard/planner',
    selector: '[data-tour="planner-title"]',
    title: 'أدخل عنوان الجدول',
    description: 'اكتب اسم الجدول في هذا الحقل المظلل.',
    action: 'input',
    actionTarget: '[data-tour="planner-title"]',
    required: true,
  },
  {
    path: '/dashboard/planner',
    selector: '[data-tour="planner-task"]',
    title: 'أدخل اسم المهمة',
    description: 'اكتب اسم المهمة الأولى هنا.',
    action: 'input',
    actionTarget: '[data-tour="planner-task"]',
    required: true,
  },
  {
    path: '/dashboard/planner',
    selector: 'input[type="date"]',
    title: 'اختر التاريخ',
    description: 'اختر تاريخ الجدول.',
    action: 'input',
    actionTarget: 'input[type="date"]',
    required: true,
  },
  {
    path: '/dashboard/planner',
    selector: 'input[type="time"]',
    title: 'اختر وقت البدء',
    description: 'حدد وقت بدء الجدول.',
    action: 'input',
    actionTarget: 'input[type="time"]',
    required: true,
  },
  {
    path: '/dashboard/planner',
    selector: '[data-tour="planner-create"]',
    title: 'إنشاء الجدول',
    description: 'اضغط زر "إنشاء الجدول".',
    action: 'click',
    actionTarget: '[data-tour="planner-create"]',
    required: true,
    autoNextPathPrefix: '/dashboard/schedule/',
  },

  // ========== صفحة الجداول ==========
  {
    path: '/dashboard/schedule',
    selector: '[data-tour="schedule-card"]',
    title: 'افتح جدولك',
    description: 'اضغط على بطاقة الجدول لفتح تفاصيلها.',
    action: 'click',
    actionTarget: '[data-tour="schedule-card"]',
    required: true,
    autoNextPathPrefix: '/dashboard/schedule/',
  },

  // ========== تفاصيل الجدول ==========
  {
    path: '/dashboard/schedule', // لن يتم استخدامه بسبب skipNavigation
    skipNavigation: true,
    selector: 'button:has(> svg.lucide-play)',
    title: 'ابدأ الجلسة',
    description: 'اضغط زر "ابدأ" في أول جلسة.',
    action: 'click',
    actionTarget: 'button:has(> svg.lucide-play)',
    required: true,
  },

  // ========== المهام ==========
  {
    path: '/dashboard/workspace',
    selector: '[data-tour="workspace-list"]',
    title: 'المهام',
    description: 'هنا تستعرض جميع المهام. اضغط "التالي".',
    action: 'wait',
  },

  // ========== الإعدادات ==========
  {
    path: '/dashboard/settings',
    selector: 'button[data-tour="toggle-theme"]',
    title: 'تبديل المظهر',
    description: 'هذا الزر يبدّل الوضع بين الداكن والفاتح. جرّبه إذا أردت، ثم اضغط "التالي" للمتابعة.',
    action: 'wait', // ✅ بدون required
  },
  {
    path: '/dashboard/settings',
    selector: 'button[data-tour="toggle-focus"]',
    title: 'وضع التركيز',
    description: 'هذا الزر يفعّل أو يلغي وضع التركيز. جرّبه إذا أردت، ثم اضغط "التالي".',
    action: 'wait', // ✅ بدون required
  },
]