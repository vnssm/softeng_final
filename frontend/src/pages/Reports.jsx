import React, { useState, useEffect } from "react";
import { FaDownload, FaChartBar, FaChartLine } from "react-icons/fa";
import "./UserManagement.css";
import "./Reports.css";

export default function Reports() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");

  const [equipmentData, setEquipmentData] = useState([]);
  const [facilityData, setFacilityData] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://localhost:5000/api/reports?range=${encodeURIComponent(timeRange)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load reports.");
        }

        setEquipmentData(data.equipmentData || []);
        setFacilityData(data.facilityData || []);
        setTrendData(data.trendData || []);
      } catch (error) {
        setError(error.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [timeRange]);

  const handleDownload = () => {
    if (
      equipmentData.length === 0 &&
      facilityData.length === 0 &&
      trendData.length === 0
    ) {
      alert("There is no report data to download.");
      return;
    }

    const rows = [];

    // Report information
    rows.push(["SYSTEM ANALYTICS AND REPORTS"]);
    rows.push(["Time Range", timeRange]);
    rows.push(["Generated At", new Date().toLocaleString()]);
    rows.push([]);

    // Most borrowed equipment
    rows.push(["MOST BORROWED EQUIPMENT"]);
    rows.push(["Equipment Name", "Quantity Borrowed"]);

    equipmentData.forEach((item) => {
      rows.push([item.name, item.count]);
    });

    rows.push([]);

    // Most reserved facilities
    rows.push(["MOST RESERVED FACILITIES"]);
    rows.push(["Facility Name", "Reservation Count"]);

    facilityData.forEach((item) => {
      rows.push([item.name, item.count]);
    });

    rows.push([]);

    // Reservation trends
    rows.push(["RESERVATION TRENDS"]);
    rows.push(["Date / Month", "Number of Reservations"]);

    trendData.forEach((item) => {
      rows.push([item.period, item.val]);
    });

    // Escape values so commas and quotation marks work correctly in CSV
    const escapeCSV = (value) => {
      return `"${String(value ?? "").replace(/"/g, '""')}"`;
    };

    const csvContent = rows
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    // Include UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `system-report-${timeRange
      .toLowerCase()
      .replace(/\s+/g, "-")}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-page">
      <div className="analytics-container">
        <div className="analytics-page-header">
          <h1>System Analytics & Reports</h1>
          <p>
            Monitor asset utilization, peak reservation volume, and reservation trends.
          </p>
        </div>

        <div className="analytics-card action-header-card">
          <div className="action-header-text">
            <h2>Asset Utilization & Volume Reports</h2>
            <p>
              View equipment borrowing, facility reservations, and reservation trends.
            </p>
          </div>

          <div className="action-header-controls">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="time-select"
            >
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="Last 90 Days">Last 90 Days</option>
              <option value="This Year">This Year</option>
            </select>

            <button className="download-btn" onClick={handleDownload}>
              <FaDownload className="btn-icon" /> Download Report
            </button>
          </div>
        </div>

        {loading && <p>Loading reports...</p>}

        {!loading && error && (
          <p className="report-error">{error}</p>
        )}

        {!loading && !error && (
          <>
            <div className="analytics-card chart-card">
              <div className="chart-card-header">
                <FaChartBar className="chart-header-icon" />
                <h2>Most Borrowed Equipment</h2>
              </div>

              {equipmentData.length > 0 ? (
                <CustomBarChart data={equipmentData} />
              ) : (
                <p>No equipment borrowing records found for this period.</p>
              )}
            </div>

            <div className="analytics-card chart-card">
              <div className="chart-card-header">
                <FaChartBar className="chart-header-icon" />
                <h2>Most Reserved Facilities</h2>
              </div>

              {facilityData.length > 0 ? (
                <CustomBarChart data={facilityData} />
              ) : (
                <p>No facility reservation records found for this period.</p>
              )}
            </div>

            <div className="analytics-card chart-card">
              <div className="chart-card-header">
                <FaChartLine className="chart-header-icon" />
                <h2>Reservation Trends</h2>
              </div>

              {trendData.length > 0 ? (
                <CustomLineChart data={trendData} />
              ) : (
                <p>No reservation trend data found for this period.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ===================== Bar Chart ===================== */
function CustomBarChart({ data }) {
  const highestCount = Math.max(
    ...data.map((item) => Number(item.count) || 0),
    1
  );

  const maxVal = Math.ceil(highestCount / 10) * 10;
  const ticks = [
    maxVal,
    maxVal * 0.75,
    maxVal * 0.5,
    maxVal * 0.25,
    0,
  ];

  return (
    <div className="custom-chart-container">
      <div className="chart-y-axis">
        {ticks.map((tick, index) => (
          <span key={index}>{Math.round(tick)}</span>
        ))}
      </div>

      <div className="chart-body-wrapper">
        <div className="chart-grid-lines">
          {ticks.map((tick, index) => (
            <div key={index} className="grid-line" />
          ))}
        </div>

        <div className="chart-bars-container">
          {data.map((item, index) => {
            const count = Number(item.count) || 0;
            const heightPercent = (count / maxVal) * 100;

            return (
              <div key={index} className="bar-column">
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.name}: ${count}`}
                  />
                </div>

                <span className="bar-label" title={item.name}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===================== Line Chart ===================== */
function CustomLineChart({ data }) {
  const chartWidth = 600;
  const chartHeight = 200;
  const padding = 20;

  const values = data.map((item) => Number(item.val) || 0);
  const maxValue = Math.max(...values, 1);
  const minValue = 0;

  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? chartWidth / 2
        : padding +
          (index / (data.length - 1)) * (chartWidth - padding * 2);

    const y =
      chartHeight -
      padding -
      ((Number(item.val) || 0) / (maxValue - minValue || 1)) *
        (chartHeight - padding * 2);

    return {
      x,
      y,
      period: item.period,
      val: Number(item.val) || 0,
    };
  });

  const pathD = points
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"} ${point.x},${point.y}`;
    })
    .join(" ");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`
      : "";

  return (
    <div className="custom-chart-container line-chart-container">
      <div className="chart-y-axis">
        {[maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0].map(
          (tick, index) => (
            <span key={index}>{Math.round(tick)}</span>
          )
        )}
      </div>

      <div className="chart-body-wrapper">
        <div className="chart-grid-lines">
          {[1, 2, 3, 4, 5].map((tick) => (
            <div key={tick} className="grid-line" />
          ))}
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="svg-line-chart"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="areaGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#075b0a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#075b0a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {points.length > 1 && (
            <>
              <path d={areaD} fill="url(#areaGradient)" />

              <path
                d={pathD}
                fill="none"
                stroke="#075b0a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#075b0a"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <title>
                {point.period}: {point.val} reservations
              </title>
            </circle>
          ))}
        </svg>

        <div className="line-x-axis">
          {points.map((point, index) => (
            <span key={index} className="line-label" title={point.period}>
              {point.period}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}