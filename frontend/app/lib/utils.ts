export const translateStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case "draft":
      return "Brouillon";
    case "pending":
      return "En attente";
    case "approved":
      return "Approuvé";
    case "approved_accounting":
      return "Visé Financièrement";
    case "rejected":
      return "Refusé";
    case "paid":
      return "Payé";
    case "cancelled":
      return "Annulé";
    default:
      return status;
  }
};
