<?php

return [
    'logo' => 'images/judi-logo.jpg',
    'logo_version' => '2',

    'company' => [
        'name' => env('JUDI_COMPANY_NAME', 'JUDI'),
        'tagline' => env('JUDI_COMPANY_TAGLINE', 'NATURE • QUALITY • TRUST'),
        'phones' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('JUDI_COMPANY_PHONES', '0750 786 5782, 0770 133 6837')),
        ))),
        'address' => env('JUDI_COMPANY_ADDRESS', ''),
        'legal_name' => env('JUDI_COMPANY_LEGAL_NAME', ''),
        'branch' => env('JUDI_COMPANY_BRANCH', ''),
    ],
];
