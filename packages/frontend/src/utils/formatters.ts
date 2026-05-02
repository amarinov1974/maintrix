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

export function formatStatus(value: string): string {
  const map: Record<string, string> = {
    Draft: 'Nacrt',
    'Ticket Submitted': 'Prijava podnesena',
    'Ticket Withdrawn': 'Prijava povučena',
    'Ticket Archived': 'Prijava arhivirana',
    'Ticket Rejected': 'Prijava odbijena',
    'Awaiting Ticket Creator Response': 'Čeka odgovor podnositelja',
    'Updated Ticket Submitted': 'Ažurirana prijava podnesena',
    'Cost Estimation Needed': 'Potrebna procjena troška',
    'Cost Estimation Approval Needed': 'Odobrenje procjene troška',
    'Ticket Cost Estimation Approved': 'Procjena troška odobrena',
    'Work Order In Progress': 'Radni nalog u tijeku',
    'Awaiting Service Provider': 'Čeka izvođača',
    'Service Visit Scheduled': 'Zakazan posjet servisera',
    'Service In Progress': 'Servis u tijeku',
    'Work In Progress': 'Rad u tijeku',
    'Service Completed': 'Servis završen',
    'Follow-Up Visit Requested': 'Zatražen dodatni posjet',
    'New Work Order Needed': 'Potreban novi radni nalog',
    'Repair Unsuccessful': 'Neuspjeli popravak',
    'Cost Proposal Prepared': 'Ponuda troška pripremljena',
    'Cost Proposal Submitted': 'Ponuda troška predana',
    'Cost Proposal Approved': 'Ponuda troška odobrena',
    'Cost Revision Requested': 'Zatražena revizija troška',
    'Cost Proposal Revision Requested': 'Zatražena revizija ponude',
    'Work Completed': 'Rad završen',
    'Closed With Cost': 'Zatvoreno s troškom',
    'Closed Without Cost': 'Zatvoreno bez troška',
    'Work Order Rejected': 'Radni nalog odbijen',
    'Follow Up Needed': 'Potreban follow-up',
    'Rejected By Provider': 'Odbijeno od izvođača',
    'Returned By Provider': 'Vraćeno od izvođača',
  };
  return map[value] ?? value;
}
