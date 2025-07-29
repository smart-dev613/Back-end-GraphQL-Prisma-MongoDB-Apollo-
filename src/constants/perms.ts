enum PERMISSION_GROUPS {
    community = 'Community',
    marketing = 'Marketing',
    auth = 'MSL',
    events = 'Events',
    studio = 'Studio'
}

/**
 * Permission access types are numerical.
 * The higher the value = the increased permission the user gets.
 * At 0, they have no access/no permission.
 * At 3, they have full access/edit and archive permission.
 */
export enum PERMISSION_ACCESS_TYPES {
    no_access = 0,
    view_only = 1,
    view_and_edit = 2,
    edit_and_archive = 3
}

/**
 * These key/values are used throughout the permissions system.
 * Adding a new key here is required to implement a new permission.
 * Setting defaults allows the permissions to be added to user groups on group creation.
 * The description and product for keys here is returned in relevant API calls.
 * This allows the frontend to display appropriate data.
 * 
 * Implemented permissions here will also need to be added in
 * src/inputs/permissions.ts so that they work with our API calls.
 */
export const PERMISSION_KEYS = {
    // Products
    community: {
        desc: {
            en: 'Access to Community',
            cn: '访问社区',
            ae: 'الوصول إلى المجتمع',
            de: 'Zugang zur Community',
            fr: 'Accès à la communauté',
            in: 'समुदाय तक पहुंच',
            jp: 'コミュニティへのアクセス',
            es: 'acceso a la comunidad',
            kr: '커뮤니티에 대한 액세스',
            pt: 'acesso à comunidade',
            se: 'tillgång till community',
            th: 'การเข้าถึงชุมชน'
        },
        product: PERMISSION_GROUPS.community,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_and_edit,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            master_admin: PERMISSION_ACCESS_TYPES.view_and_edit
        }
    },
    marketing: {
        desc: {
            en: 'Access to Marketing',
            cn: '进入市场营销',
            ae: 'الوصول إلى التسويق',
            de: 'Zugang zu Marketing',
            fr: 'l’accès au marketing',
            in: 'विपणन तक पहुंच',
            jp: 'マーケティングへのアクセス',
            es: 'acceso al marketing',
            kr: '마케팅 에 대한 액세스',
            pt: 'acesso ao marketing',
            se: 'tillgång till marknadsföring',
            th: 'การเข้าถึงการตลาด'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_and_edit,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            master_admin: PERMISSION_ACCESS_TYPES.view_and_edit
        }
    },
    events: {
        desc: {
            en: 'Access to Events',
            cn: '访问活动',
            ae: 'الوصول إلى الأحداث',
            de: 'Zugriff auf Veranstaltungen',
            fr: 'l’accès aux événements',
            in: 'घटनाओं तक पहुंच',
            jp: 'イベントへのアクセス',
            es: 'acceso a eventos',
            kr: '이벤트에 대한 액세스',
            pt: 'acesso a eventos',
            se: 'tillgång till händelser',
            th: 'การเข้าถึงเหตุการณ์'
        },
        product: PERMISSION_GROUPS.events,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    // MSL
    msl_companyProfile: {
        desc: {
            en: 'Company Profile',
            cn: '公司简介',
            ae: 'ملف تعريف الشركة',
            de: 'Unternehmensprofil',
            fr: 'profil de l’entreprise',
            in: 'कंपनी प्रोफाइल',
            jp: '会社プロファイル',
            es: 'perfil de la empresa',
            kr: '회사 프로필',
            pt: 'perfil da empresa',
            se: 'företagsprofil',
            th: 'รายละเอียดบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyEmployees: {
        desc: {
            en: 'Company Employees (HR)',
            cn: '公司员工（小时）',
            ae: 'موظفو الشركة (HR)',
            de: 'Mitarbeiter des Unternehmens (HR)',
            fr: 'Employés de l’entreprise (RH)',
            in: 'कंपनी कर्मचारी (मानव संसाधन)',
            jp: '会社員(人事)',
            es: 'Empleados de la empresa (HR)',
            kr: '회사 직원 (HR)',
            pt: 'Funcionários da Empresa (RH)',
            se: 'Företagets anställda (HR)',
            th: 'พนักงานบริษัท (HR)'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyPermissions: {
        desc: {
            en: 'Company Permissions',
            cn: '公司权限',
            ae: 'أذونات الشركة',
            de: 'Unternehmensberechtigungen',
            fr: 'Autorisations d’entreprise',
            in: 'कंपनी की अनुमतियां',
            jp: '会社のアクセス許可',
            es: 'Permisos de empresa',
            kr: '회사 권한',
            pt: 'Permissões da empresa',
            se: 'Företagsbehörigheter',
            th: 'สิทธิการได้รับอนุญาตของบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyRelationships: {
        desc: {
            en: 'Company Relationships',
            cn: '公司关系',
            ae: 'علاقات الشركة',
            de: 'Unternehmensbeziehungen',
            fr: 'Relations d’entreprise',
            in: 'कंपनी के रिश्ते',
            jp: '会社関係',
            es: 'relación con la empresa',
            kr: '회사 관계',
            pt: 'relação empresa',
            se: 'företagsrelation',
            th: 'ความสัมพันธ์กับบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyRelationshipsEmployees: {
        desc: {
            en: 'Company Relationships (Assign Employees)',
            cn: '公司关系（指派员工）',
            ae: 'علاقات الشركة (تعيين الموظفين)',
            de: 'Unternehmensbeziehungen (Mitarbeiter zuweisen)',
            fr: 'Relations d’entreprise (assigner des employés)',
            in: 'कंपनी के रिश्ते (कर्मचारियों को असाइन करें)',
            jp: '会社関係 (従業員の割り当て)',
            es: 'Relaciones con la empresa (Asignar empleados)',
            kr: '회사 관계(직원 할당)',
            pt: 'Relações com a Empresa (Atribuir Funcionários)',
            se: 'Företagsrelationer (tilldela medarbetare)',
            th: 'ความสัมพันธ์ของบริษัท (กําหนดพนักงาน)'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_employeeProfile: {
        desc: {
            en: 'Employee Profile',
            cn: '员工简介',
            ae: 'ملف تعريف الموظف',
            de: 'Mitarbeiterprofil',
            fr: 'Profil de l’employé',
            in: 'कर्मचारी प्रोफाइल',
            jp: '従業員プロファイル',
            es: 'Perfil del empleado',
            kr: '직원 프로필',
            pt: 'Perfil do funcionário',
            se: 'Medarbetarprofil',
            th: 'ประวัติพนักงาน'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_employeeMeetings: {
        desc: {
            en: 'Employee Meetings',
            cn: '员工会议',
            ae: 'اجتماعات الموظفين',
            de: 'Mitarbeiterversammlungen',
            fr: 'Réunions d’employés',
            in: 'कर्मचारी बैठकें',
            jp: '従業員会議',
            es: 'Reuniones de empleados',
            kr: '직원 회의',
            pt: 'Reuniões de funcionários',
            se: 'Medarbetarmöten',
            th: 'การประชุมพนักงาน'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyBilling: {
        desc: {
            en: 'Company Billing',
            cn: '公司计费',
            ae: 'فوترة الموظفين',
            de: 'Mitarbeiterabrechnung',
            fr: 'Facturation des employés',
            in: 'कर्मचारी बिलिंग',
            jp: '従業員請求',
            es: 'Facturación de empleados',
            kr: '직원 청구',
            pt: 'Faturamento dos funcionários',
            se: 'Fakturering av medarbetare',
            th: 'การเรียกเก็บเงินสําหรับพนักงาน'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyBillingCards: {
        desc: {
            en: 'Company Payment Cards',
            cn: '公司支付卡',
            ae: 'بطاقات الدفع الخاصة بالشركة',
            de: 'Firmen-Zahlungskarten',
            fr: 'Cartes de paiement d’entreprise',
            in: 'कंपनी भुगतान कार्ड',
            jp: '会社の支払カード',
            es: 'Tarjetas de pago de la empresa',
            kr: '회사 결제 카드',
            pt: 'Cartões de Pagamento da Empresa',
            se: 'Företagets betalkort',
            th: 'บัตรชําระเงินของบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyBillingWithdraw: {
        desc: {
            en: 'Company Funds/Withdrawal',
            cn: '公司资金/提款',
            ae: 'أموال الشركة/السحب',
            de: 'Unternehmensfonds/Rücknahme',
            fr: 'Fonds de l’entreprise/Retrait',
            in: 'कंपनी फंड/निकासी',
            jp: '会社資金/引き出し',
            es: 'Fondos de la empresa/Retiro',
            kr: '회사 자금/인출',
            pt: 'Fundos/Saques da Empresa',
            se: 'Företagsfonder/uttag',
            th: 'กองทุน/ถอนเงินของบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.view_only,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    msl_companyBillingTransactions: {
        desc: {
            en: 'Company Transactions',
            cn: '公司交易',
            ae: 'معاملات الشركة',
            de: 'Unternehmenstransaktionen',
            fr: 'Transactions de l’entreprise',
            in: 'कंपनी लेनदेन',
            jp: '会社トランザクション',
            es: 'Transacciones de la empresa',
            kr: '회사 거래',
            pt: 'Transações da empresa',
            se: 'Företagstransaktioner',
            th: 'ธุรกรรมของบริษัท'
        },
        product: PERMISSION_GROUPS.auth,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    // Marketing
    marketing_campaigns: {
        desc: {
            en: 'Campaigns',
            cn: '活动',
            ae: 'حملات',
            de: 'Kampagnen',
            fr: 'Campagnes',
            in: 'अभियान',
            jp: 'キャンペーン',
            es: 'Campañas',
            kr: '캠페인',
            pt: 'Campanhas',
            se: 'Kampanjer',
            th: 'เปญ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_media: {
        desc: {
            en: 'Media',
            cn: '媒体',
            ae: 'وسائل الإعلام',
            de: 'Medien',
            fr: 'Médias',
            in: 'मीडिया',
            jp: 'メディア',
            es: 'Medios de comunicación',
            kr: '미디어',
            pt: 'meios de comunicação',
            se: 'Media',
            th: 'สื่อ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_mediaSubmitApproval: {
        desc: {
            en: 'Submit Flight Approval',
            cn: '提交航班批准',
            ae: 'تقديم الموافقة على الطيران',
            de: 'Fluggenehmigung einreichen',
            fr: 'Soumettre l’approbation de vol',
            in: 'उड़ान अनुमोदन सबमिट करें',
            jp: 'フライト承認の送信',
            es: 'Presentar aprobación de vuelo',
            kr: '항공편 승인 제출',
            pt: 'Enviar aprovação de voo',
            se: 'Skicka in flyggodkännande',
            th: 'ส่งการอนุมัติเที่ยวบิน'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_mediaApproveFlight: {
        desc: {
            en: 'Approve Flights',
            cn: '批准航班',
            ae: 'رحلات الموافقة',
            de: 'Genehmigungsflüge',
            fr: 'Vols d’approbation',
            in: 'अनुमोदन उड़ानें',
            jp: '承認フライト',
            es: 'Vuelos de aprobación',
            kr: '승인 항공편',
            pt: 'Voos de aprovação',
            se: 'Godkännandeflygningar',
            th: 'อนุมัติเที่ยวบิน'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_mediaPauseFlight: {
        desc: {
            en: 'Pause Flights',
            cn: '暂停航班',
            ae: 'إيقاف رحلات الطيران',
            de: 'Pausenflüge',
            fr: 'vols de pause',
            in: 'उड़ानों को रोकें',
            jp: 'フライトを一時停止する',
            es: 'pausar los vuelos',
            kr: '항공편 일시 중지',
            pt: 'pausa voos',
            se: 'pausa flyg',
            th: 'หยุดเที่ยวบินชั่วคราว'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_codes: {
        desc: {
            en: 'Codes',
            cn: '代号',
            ae: 'رموز',
            de: 'Codes',
            fr: 'Codes',
            in: 'कोड्स',
            jp: 'コード',
            es: 'Codigos',
            kr: '코드',
            pt: 'Códigos',
            se: 'Koder',
            th: 'รหัส'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_codesTargeting: {
        desc: {
            en: 'Codes Targeting',
            cn: '针对的代码',
            ae: 'استهداف الرموز',
            de: 'Codes Targeting',
            fr: 'Ciblage des codes',
            in: 'कोड टार्गेटिंग',
            jp: 'コードターゲティング',
            es: 'Segmentación de códigos',
            kr: '코드 타겟팅',
            pt: 'Segmentação de códigos',
            se: 'Inriktning på koder',
            th: 'การกําหนดเป้าหมายโค้ด'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_customers: {
        desc: {
            en: 'Customers',
            cn: '顾客',
            ae: 'العملاء',
            de: 'Kunden',
            fr: 'Les clients',
            in: 'ग्राहकों',
            jp: 'お客様',
            es: 'Clientes',
            kr: '고객',
            pt: 'clientes',
            se: 'Kunder',
            th: 'ลูกค้า'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_customersUpload: {
        desc: {
            en: 'Upload Customers',
            cn: '上传客户',
            ae: 'تحميل العملاء',
            de: 'Hochladen von Kunden',
            fr: 'télécharger des clients',
            in: 'ग्राहकों को अपलोड करें',
            jp: '顧客をアップロードする',
            es: 'subir a los clientes',
            kr: '고객 업로드',
            pt: 'carregar clientes',
            se: 'ladda upp kunder',
            th: 'อัปโหลดลูกค้า'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_customersClusters: {
        desc: {
            en: 'Customers Clusters',
            cn: '客户群集',
            ae: 'مجموعات العملاء',
            de: 'Kundencluster',
            fr: 'grappes de clients',
            in: 'ग्राहक समूह',
            jp: '顧客クラスター',
            es: 'clústeres de clientes',
            kr: '고객 클러스터',
            pt: 'clusters clientes',
            se: 'kundkluster',
            th: 'กลุ่มลูกค้า'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_customersRules: {
        desc: {
            en: 'Customers Rules',
            cn: '客户规则',
            ae: 'قواعد العملاء',
            de: 'Kundenregeln',
            fr: 'règles clients',
            in: 'ग्राहकों के नियम',
            jp: '顧客ルール',
            es: 'reglas de los clientes',
            kr: '고객 규칙',
            pt: 'regras dos clientes',
            se: 'kundernas regler',
            th: 'กฎของลูกค้า'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_mailing: {
        desc: {
            en: 'Mailing',
            cn: '邮寄',
            ae: 'المراسلات',
            de: 'Mailing',
            fr: 'Envoi postal',
            in: 'डाक',
            jp: '郵送',
            es: 'Envío',
            kr: '우편물',
            pt: 'Enviando',
            se: 'Mailing',
            th: 'การส่งจดหมาย'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_events: {
        desc: {
            en: 'Events',
            cn: '大事记',
            ae: 'الأحداث',
            de: 'Veranstaltungen',
            fr: 'Événements',
            in: 'आयोजन',
            jp: 'イベント',
            es: 'Eventos',
            kr: '이벤트',
            pt: 'Eventos',
            se: 'evenemang',
            th: 'เหตุการณ์'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_strategy: {
        desc: {
            en: 'Strategy',
            cn: '战略',
            ae: 'إستراتيجية',
            de: 'Strategie',
            fr: 'Stratégie',
            in: 'रणनीति',
            jp: '戦略',
            es: 'Estrategia',
            kr: '전략',
            pt: 'Estratégia',
            se: 'Strategi',
            th: 'กลยุทธ์'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_research: {
        desc: {
            en: 'Research',
            cn: '研究',
            ae: 'ابحاث',
            de: 'Forschung',
            fr: 'Recherche',
            in: 'अनुसंधान',
            jp: '研究',
            es: 'Investigación',
            kr: '연구',
            pt: 'Pesquisa',
            se: 'Forskning',
            th: 'การวิจัย'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_studio: {
        desc: {
            en: 'Studio',
            cn: '工作室',
            ae: 'ستوديو',
            de: 'Studio',
            fr: 'Studio',
            in: 'स्टूडिय  ो',
            jp: 'スタジオ',
            es: 'Estudio',
            kr: '사진관',
            pt: 'Estúdio',
            se: 'Studio',
            th: 'สตูดิโอ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_studioOpenProject: {
        desc: {
            en: 'Open Studio Project',
            cn: '开放式工作室项目',
            ae: 'مشروع ستوديو مفتوح',
            de: 'Open Studio Project',
            fr: 'Projet Open Studio',
            in: 'ओपन स्टूडियो प्रोजेक्ट',
            jp: 'スタジオプロジェクトを開く',
            es: 'Proyecto Open Studio',
            kr: '오픈 스튜디오 프로젝트',
            pt: 'Projeto estúdio aberto',
            se: 'Öppna studioprojekt',
            th: 'เปิดโครงการสตูดิโอ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_reporting: {
        desc: {
            en: 'Reporting',
            cn: '报告中',
            ae: 'الإبلاغ',
            de: 'Berichterstattung',
            fr: 'Rapports',
            in: 'रिपोर्टिंग',
            jp: '報告',
            es: 'Reportando',
            kr: '보고',
            pt: 'Comunicando',
            se: 'Rapportering',
            th: 'การรายงาน'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_admin: {
        desc: {
            en: 'Admin',
            cn: '管理员',
            ae: 'مشرف',
            de: 'Administrator',
            fr: 'Administrateur',
            in: 'व्यवस्थापक',
            jp: '管理者',
            es: 'Administración',
            kr: '관리자',
            pt: 'Admin',
            se: 'Administration',
            th: 'ธุรการ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminSites: {
        desc: {
            en: 'Admin Publisher Sites',
            cn: '管理发布者网站',
            ae: 'مواقع ناشر المسؤول',
            de: 'Admin Publisher-Sites',
            fr: 'Sites d’éditeurs admin',
            in: 'व्यवस्थापक प्रकाशक साइटें',
            jp: '管理者パブリッシャー サイト',
            es: 'Sitios de editores de administración',
            kr: '관리자 게시자 사이트',
            pt: 'Sites de editores administrativos',
            se: 'Admin Publisher-webbplatser',
            th: 'ไซต์ผู้เผยแพร่ของผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminBrands: {
        desc: {
            en: 'Admin Publisher Brands',
            cn: '管理发布商品牌',
            ae: 'العلامات التجارية للناشرين المسؤولين',
            de: 'Admin-Publisher-Marken',
            fr: 'marques admin éditeur',
            in: 'व्यवस्थापक प्रकाशक ब्रांड',
            jp: '管理者パブリッシャーブランド',
            es: 'marcas de editores administradores',
            kr: '관리자 게시자 브랜드',
            pt: 'marcas de editores administradores',
            se: 'varumärken för administratörsutgivare',
            th: 'แบรนด์ผู้เผยแพร่ผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminZones: {
        desc: {
            en: 'Admin Publisher Zones',
            cn: '管理发布区',
            ae: 'مناطق ناشر المسؤول',
            de: 'Admin-Publisher-Zonen',
            fr: 'zones d’éditeurs admin',
            in: 'व्यवस्थापक प्रकाशक क्षेत्र',
            jp: '管理パブリッシャー ゾーン',
            es: 'zonas de editores administradores',
            kr: '관리자 게시자 영역',
            pt: 'zonas de editores administradores',
            se: 'administratörsutgivarzoner',
            th: 'โซนผู้เผยแพร่ผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminPublisherProfile: {
        desc: {
            en: 'Admin Publisher Profile',
            cn: '管理员发布者配置文件',
            ae: 'ملف تعريف ناشر المسؤول',
            de: 'Administrator-Publisher-Profil',
            fr: 'profil de l’éditeur admin',
            in: 'व्यवस्थापक प्रकाशक प्रोफाइल',
            jp: '管理者の発行元プロファイル',
            es: 'perfil del editor administrador',
            kr: '관리자 게시자 프로필',
            pt: 'perfil de editor administrativo',
            se: 'administratörsutgivarprofil',
            th: 'โปรไฟล์ผู้เผยแพร่ของผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminClientRates: {
        desc: {
            en: 'Admin Rates',
            cn: '管理费率',
            ae: 'أسعار المسؤول',
            de: 'Admin-Raten',
            fr: 'taux d’administration',
            in: 'व्यवस्थापक दरें',
            jp: '管理率',
            es: 'tasas de administración',
            kr: '관리자 요금',
            pt: 'taxas de administração',
            se: 'administratörshastigheter',
            th: 'อัตราผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminDeliveries: {
        desc: {
            en: 'Admin Deliveries',
            cn: '管理员交付',
            ae: 'عمليات تسليم المسؤول',
            de: 'Admin-Lieferungen',
            fr: 'livraisons admin',
            in: 'व्यवस्थापक प्रसव',
            jp: '管理者の配信',
            es: 'entregas de administración',
            kr: '관리자 배달',
            pt: 'entregas administrativas',
            se: 'administratörsleveranser',
            th: 'การจัดส่งของผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminPackages: {
        desc: {
            en: 'Admin Packages',
            cn: '管理包',
            ae: 'حزم المسؤول',
            de: 'admin-Pakete',
            fr: 'paquets admin',
            in: 'व्यवस्थापक संकुल',
            jp: '管理パッケージ',
            es: 'paquetes de administración',
            kr: '관리자 패키지',
            pt: 'pacotes de administração',
            se: 'administratörspaket',
            th: 'แพคเกจผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminTransactions: {
        desc: {
            en: 'Admin Transactions',
            cn: '管理事务',
            ae: 'معاملات المسؤول',
            de: 'admin transacions',
            fr: 'transactions administratives',
            in: 'व्यवस्थापक लेन-देन',
            jp: '管理トランザクション',
            es: 'transacciones administrativas',
            kr: '관리자 트랜잭션',
            pt: 'transações administrativas',
            se: 'administratörstransaktion',
            th: 'ธุรกรรมผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    marketing_adminTopups: {
        desc: {
            en: 'Admin Topups',
            cn: '管理充值',
            ae: 'المسؤول الأعلى',
            de: 'Admin-Auf-Ups',
            fr: 'recharges admin',
            in: 'व्यवस्थापक टॉपअप',
            jp: '管理トップアップ',
            es: 'recargas administrativas',
            kr: '관리자 토업',
            pt: 'topups administrativos',
            se: 'överst på administrationen',
            th: 'การเติมเงินผู้ดูแลระบบ'
        },
        product: PERMISSION_GROUPS.marketing,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.no_access,
            admin: PERMISSION_ACCESS_TYPES.no_access,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    // Events
    events_admin: {
        desc: {
            en: 'Admin',
            cn: '管理员',
            ae: 'مشرف',
            de: 'Administrator',
            fr: 'Administrateur',
            in: 'व्यवस्थापक',
            jp: '管理者',
            es: 'Administración',
            kr: '관리자',
            pt: 'Admin',
            se: 'Administration',
            th: 'ธุรการ'
        },
        product: PERMISSION_GROUPS.events,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    // Community
    community_marketplace: {
        desc: {
            en: 'Marketplace',
            cn: '市场',
            ae: 'السوق',
            de: 'Markt',
            fr: 'Marché',
            in: 'बाजार',
            jp: '市場',
            es: 'Mercado',
            kr: '시장',
            pt: 'Mercado',
            se: 'Marknaden',
            th: 'ตลาด'
        },
        product: PERMISSION_GROUPS.community,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    community_boards: {
        desc: {
            en: 'Boards',
            cn: '板',
            ae: 'المجالس',
            de: 'Boards',
            fr: 'Conseils',
            in: 'बोर्डों',
            jp: 'ボード',
            es: 'Tableros',
            kr: '보드',
            pt: 'Placas',
            se: 'Styrelser',
            th: 'คณะ กรรมการ'
        },
        product: PERMISSION_GROUPS.community,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    // Studio
    studio_publish: {
        desc: {
            en: 'Publish',
            cn: '发布',
            ae: 'ينشر',
            de: 'Veröffentlichen',
            fr: 'Publier',
            in: 'प्रकाशित करें',
            jp: '公開する',
            es: 'Publicar',
            kr: '게시',
            pt: 'Publicar',
            se: 'Publicera',
            th: 'เผยแพร่'
        },
        product: PERMISSION_GROUPS.studio,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_and_edit,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    },
    studio_marketplace: {
        desc: {
            en: 'Marketplace',
            cn: '市场',
            ae: 'السوق',
            de: 'Markt',
            fr: 'Marché',
            in: 'बाजार',
            jp: '市場',
            es: 'Mercado',
            kr: '시장',
            pt: 'Mercado',
            se: 'Marknaden',
            th: 'ตลาด'
        },
        product: PERMISSION_GROUPS.studio,
        defaults: {
            user: PERMISSION_ACCESS_TYPES.view_only,
            admin: PERMISSION_ACCESS_TYPES.view_only,
            super_admin: PERMISSION_ACCESS_TYPES.edit_and_archive,
            master_admin: PERMISSION_ACCESS_TYPES.edit_and_archive
        }
    }
  }
  