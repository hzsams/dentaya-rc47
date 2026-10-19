export function memberRoleLabel(value:string) {
  const labels={owner:'Kurum Sahibi',admin:'Yönetici',dentist:'Diş Hekimi',doctor:'Diş Hekimi',technician:'Teknisyen',assistant:'Asistan',courier:'Kurye',member:'Ekip üyesi',billing:'Muhasebe'} as Record<string,string>;
  return Object.hasOwn(labels,value)?labels[value]:value;
}
export function vehicleLabel(value:string) {
  const labels={motorcycle:'Motosiklet',motorbike:'Motosiklet',car:'Otomobil',van:'Minibüs',bicycle:'Bisiklet',bike:'Bisiklet',walking:'Yaya',truck:'Kamyon'} as Record<string,string>;
  return Object.hasOwn(labels,value)?labels[value]:value;
}
