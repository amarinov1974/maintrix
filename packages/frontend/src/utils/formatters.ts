export function formatCategory(value: string): string {
  const map: Record<string, string> = {
    ELECTRICAL_INSTALLATIONS: 'Elektroinstalacije',
    HEATING_VENTILATION_AIR_CONDITIONING: 'Grijanje, ventilacija i klima',
    REFRIGERATION: 'Rashlađivanje',
    KITCHEN_EQUIPMENT: 'Kuhinjska oprema',
    ELEVATORS: 'Liftovi',
    AUTOMATIC_DOORS: 'Automatska vrata',
    FIRE_PROTECTION_SYSTEM: 'Zaštita od požara',
    WATER_AND_SEWAGE: 'Vodoopskrba i kanalizacija',
    CONSTRUCTION_WORKS: 'Građevinski radovi',
    HYGIENE: 'Higijena',
    ENVIRONMENTAL: 'Okoliš',
    OTHER: 'Ostalo',
  };
  return map[value] ?? value.replace(/_/g, ' ');
}

export function formatHistoryAction(value: string): string {
  const map: Record<string, string> = {
    CREATE: 'Kreirano',
    SUBMIT: 'Prijavljeno',
    REQUEST_CLARIFICATION: 'Traženo pojašnjenje',
    PROVIDE_CLARIFICATION: 'Pojašnjenje dano',
    APPROVE_FOR_ESTIMATION: 'Odobreno za procjenu',
    REQUEST_APPROVAL: 'Poslano na odobrenje',
    ESCALATE: 'Eskalirano',
    APPROVE: 'Odobreno',
    REJECT: 'Odbijeno',
    RETURN_TO_AMM: 'Vraćeno na VMO',
    CREATE_WORK_ORDER: 'Kreiran radni nalog',
    ARCHIVE: 'Arhivirano',
  };
  return map[value] ?? value.replace(/_/g, ' ');
}

export function formatAssetStatus(value: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Aktivno',
    FAULTY: 'Kvar',
    IN_SERVICE: 'Na servisu',
    DECOMMISSIONED: 'Otpisano',
  };
  return map[value] ?? value;
}
