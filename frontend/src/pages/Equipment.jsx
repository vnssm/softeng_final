import React, { useState } from "react";
import BorrowerEquipment from "../components/equipment/BorrowerEquipment"
import GSDEquipment from "../components/equipment/GSDEquipment";
import AdminEquipment from "../components/equipment/AdminEquipment";
// import PersonnelEquipment from "../components/equipment/PersonnelEquipment";

function Equipment() {
  const role = localStorage.getItem("role") || "borrower";

  return (
    <div>
      {role === "borrower" && <BorrowerEquipment />}
      {role === "personnel" && <GSDEquipment />}
      {role === "admin" && <AdminEquipment />}
    </div>
  );
}

export default Equipment;