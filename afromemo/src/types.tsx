export enum Status {
  INACTIVE = 0,
  ACTIVE = 1,
  PENDING = 2,
  DELETED = 3,
}

export interface AgendaItem {
  subtitle: string;
  id?: string | number;
  title: string;
  link: string;
  price: number;
  address: string;
  startdate: string;
  enddate: string;
  description: string;
  poster: string; // image path
  category: string;
  tags: string[];
  infos: string;
  status: Status; // default status,
  place: string;
  starttime: string;
  endtime: string;
  venuename: string;
  email?: string;
  userSubmission?: boolean;
  token?: string;
}
export enum Places {
  GENEVE = "Genève",
  LAUSANNE = "Lausanne",
  ALTSWISS = "Suisse globale",
  INTERNATIONAL = "International",
}

export enum Categories {
  SPECTACLES = "Spectacles",
  CONFERENCES = "Conférences",
  EXPOSITIONS = "Expositions",
  MUSIQUE = "Musique et fête",
  JEUNES = "Jeunes",
  DIVERS = "Divers",
}

export interface UserSubmission {
  submission: AgendaItem;
  email: string;
}
