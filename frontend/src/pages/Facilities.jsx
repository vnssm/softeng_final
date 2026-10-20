import React, { useState } from "react";
import BorrowerFacilities from "../components/facilities/BorrowerFacilities"
import GSDFacilities from "../components/facilities/GSDFacilities";
import AdminFacilities from "../components/facilities/AdminFacilities";
// import PersonnelFacilities from "../components/facilities/PersonnelFacilities";

function Facilities() {
  const role = localStorage.getItem("role") || "borrower";

  return (
    <div>
      {role === "borrower" && <BorrowerFacilities />}
      {role === "personnel" && <GSDFacilities />}
      {role === "admin" && <AdminFacilities />}
    </div>
  );
}

export default Facilities;