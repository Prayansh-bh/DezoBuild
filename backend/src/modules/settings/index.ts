export interface CompanySettingsDto {
  companyName: string;
  legalName: string;
  gstin: string;
  panNumber: string;
  cinNumber: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  fiscalYearStart: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
}

export interface SettingsServiceContract {
  getCompanySettings(): Promise<CompanySettingsDto>;
  updateCompanySettings(settings: Partial<CompanySettingsDto>): Promise<CompanySettingsDto>;
}
