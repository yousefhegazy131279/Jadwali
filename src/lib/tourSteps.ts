export type TourStep = {
    path: string
    selector: string
    title: string
    description: string
    placement?: 'top' | 'bottom' | 'right' | 'left' | 'center'
  }
  
  export const tourSteps: TourStep[] = [
    {
      path: '/dashboard',
      selector: '[data-tour="dashboard-header"]',
      title: 'مرحباً بك في جَدْوَلِي',
      description: 'هذه لوحة التحكم الرئيسية. من هنا يمكنك رؤية ملخص يومك والجلسات والمهام.',
      placement: 'bottom',
    },
    {
      path: '/dashboard',
      selector: '[data-tour="dashboard-stats"]',
      title: 'الإحصائيات',
      description: 'هذه البطاقات تعرض عدد الجداول، المهام المتبقية، الجلسات المتبقية والمنجزة.',
      placement: 'bottom',
    },
    {
      path: '/dashboard',
      selector: '[data-tour="dashboard-timer"]',
      title: 'المؤقت',
      description: 'عند بدء جلسة من جدولك، سيظهر هنا مؤقت دائري مع إمكانية الإيقاف والاستئناف.',
      placement: 'left',
    },
    {
      path: '/dashboard',
      selector: '[data-tour="dashboard-schedules"]',
      title: 'الجداول',
      description: 'هنا قائمة بجداولك. يمكنك النقر على أي جدول لفتحه أو حذفه.',
      placement: 'top',
    },
    {
      path: '/dashboard/planner',
      selector: '[data-tour="planner-form"]',
      title: 'إنشاء جدول جديد',
      description: 'أدخل عنوان الجدول واختر التاريخ والوقت. لن يُسمح بوقت في الماضي.',
      placement: 'bottom',
    },
    {
      path: '/dashboard/planner',
      selector: '[data-tour="planner-tasks"]',
      title: 'المهام الأساسية',
      description: 'أضف المهام الدراسية مع التصنيف والمدة بالساعات.',
      placement: 'bottom',
    },
    {
      path: '/dashboard/planner',
      selector: '[data-tour="planner-pomodoro"]',
      title: 'إعدادات بومودورو',
      description: 'خصص مدة الجلسة والراحة حسب رغبتك.',
      placement: 'left',
    },
    {
      path: '/dashboard/planner',
      selector: '[data-tour="planner-generate"]',
      title: 'إنشاء الجدول',
      description: 'اضغط هنا بعد ملء البيانات وسيتم إنشاء الجدول مع المهام والصلوات.',
      placement: 'top',
    },
    {
      path: '/dashboard/schedule',
      selector: '[data-tour="schedule-list"]',
      title: 'صفحة الجداول',
      description: 'هنا تظهر جميع جداولك مع حالة التقدم. اضغط على أي بطاقة لفتح تفاصيلها والبدء بالجلسات.',
      placement: 'bottom',
    },
    {
      path: '/dashboard/workspace',
      selector: '[data-tour="workspace-list"]',
      title: 'المهام',
      description: 'هنا يمكنك استعراض جميع المهام من جميع الجداول (قراءة فقط).',
      placement: 'bottom',
    },
    {
      path: '/dashboard/settings',
      selector: '[data-tour="settings-theme"]',
      title: 'الإعدادات',
      description: 'غيّر المظهر، أوقات الصلاة، وإعدادات بومودورو.',
      placement: 'bottom',
    },
  ]