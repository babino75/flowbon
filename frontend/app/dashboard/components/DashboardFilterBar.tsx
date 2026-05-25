"use client";

import React from "react";

export default function DashboardFilterBar({
  period,
  setPeriod,
  selectedStatus,
  setSelectedStatus,
  selectedCategory,
  setSelectedCategory,
  selectedEmployee,
  setSelectedEmployee,
  selectedProject,
  setSelectedProject,
  selectedDepartment,
  setSelectedDepartment,
  selectedCaisse,
  setSelectedCaisse,
  categories = [],
  employees = [],
  projects = [],
  departments = [],
  caisses = [],
  showEmployeeFilter
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
          <span>🔍</span> Filtrer par :
        </span>

        {/* Date / Période */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="month">📅 Mois en cours</option>
          <option value="quarter">📅 Trimestre</option>
          <option value="year">📅 Année</option>
        </select>

        {/* Statut */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">🟢 Tous les statuts</option>
          <option value="pending">🟡 En attente</option>
          <option value="approved">🔵 Approuvés</option>
          <option value="paid">🟢 Payés</option>
          <option value="rejected">🔴 Rejetés</option>
        </select>

        {/* Catégorie */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="">📂 Toutes les catégories</option>
          {categories.map((cat: any) => (
            <option key={cat.id} value={cat.id}>
              📂 {cat.name}
            </option>
          ))}
        </select>

        {/* Projet */}
        {projects.length > 0 && (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">🎯 Tous les projets</option>
            {projects.map((proj: any) => (
              <option key={proj.id} value={proj.id}>
                🎯 {proj.name}
              </option>
            ))}
          </select>
        )}

        {/* Département */}
        {departments.length > 0 && (
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">🏢 Tous les départements</option>
            {departments.map((dept: any) => (
              <option key={dept.id} value={dept.id}>
                🏢 {dept.name}
              </option>
            ))}
          </select>
        )}

        {/* Caisse */}
        {caisses.length > 0 && (
          <select
            value={selectedCaisse}
            onChange={(e) => setSelectedCaisse(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">💰 Toutes les caisses</option>
            {caisses.map((caisse: any) => (
              <option key={caisse.id} value={caisse.id}>
                💰 {caisse.name}
              </option>
            ))}
          </select>
        )}

        {/* Collaborateur (Admin / Comptable uniquement) */}
        {showEmployeeFilter && (
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[180px]"
          >
            <option value="">👥 Tous les collaborateurs</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                👤 {emp.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bouton de réinitialisation si des filtres sont actifs */}
      {(selectedStatus || selectedCategory || selectedEmployee || selectedProject || selectedDepartment || selectedCaisse || period !== "month") && (
        <button
          onClick={() => {
            setSelectedStatus("");
            setSelectedCategory("");
            setSelectedEmployee("");
            setSelectedProject("");
            setSelectedDepartment("");
            setSelectedCaisse("");
            setPeriod("month");
          }}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition duration-150 flex items-center gap-1 shadow-sm"
        >
          <span>🔄</span> Réinitialiser
        </button>
      )}
    </div>
  );
}
