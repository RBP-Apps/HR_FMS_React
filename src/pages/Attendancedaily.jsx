import React, { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';
import Select from 'react-select';


const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  // const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // States
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedName, setSelectedName] = useState('');

  const [uniqueMonths, setUniqueMonths] = useState([]);
  const [uniqueNames, setUniqueNames] = useState([]);

  const [selectedYear, setSelectedYear] = useState('');
  const [uniqueYears, setUniqueYears] = useState([]);

  const fetchUniqueMonths = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?action=getUniqueMonths'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUniqueMonths(result.months || []);
      }
    } catch (error) {
      console.error('Error fetching unique months:', error);
    }
  };

  const fetchUniqueNames = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?action=getUniqueNames'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUniqueNames(result.names || []);
      }
    } catch (error) {
      console.error('Error fetching unique names:', error);
    }
  };


  const fetchAttendanceData = async (pageNum = 1, append = false, filters = {}) => {
    if (pageNum === 1) {
      // setLoading(true);
      setTableLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      // Build query params with filters
      let url = `https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?sheet=Report Daily&action=fetch&page=${pageNum}&limit=500`;

      if (filters.year) {
        url += `&year=${encodeURIComponent(filters.year)}`;
      }

      if (filters.month) {
        url += `&month=${encodeURIComponent(filters.month)}`;
      }
      if (filters.name) {
        url += `&name=${encodeURIComponent(filters.name)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      const rawData = result.data || [];
      const dataRows = rawData.length > 1 ? rawData.slice(1) : [];

      const processedData = dataRows.map((row) => ({
        year: row[0] || '',
        monthName: row[1] || '',
        date: row[2] || '',
        empIdCode: row[3] || '',
        name: row[4] || '',
        inTime: row[5] || '',
        outTime: row[6] || '',
        day: row[7] || '',
      }));

      if (append) {
        setAttendanceData(prev => [...prev, ...processedData]);
      } else {
        setAttendanceData(processedData);
      }

      setHasMore(result.pagination?.hasMore || false);
      setPage(pageNum);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      // setLoading(false);
      setTableLoading(false);
      setIsLoadingMore(false);
    }
  };

  const fetchUniqueYears = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycby9QCly-0XBtGHUqanlO6mPWRn79e_XOYhYUG6irCL60WG96JJpDCc4iTOdLRuVeUOa/exec?action=getUniqueYears'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUniqueYears(result.years || []);
      }
    } catch (error) {
      console.error('Error fetching unique years:', error);
    }
  };

  // Initial load
  useEffect(() => {
    // fetchAttendanceData(1, false, { month: selectedMonth, name: selectedName });
    fetchUniqueMonths();
    fetchUniqueYears();
    fetchUniqueNames();
  }, []);

  // When filters change, reset and fetch
  // When filters change, reset and fetch
  //   useEffect(() => {
  //   setPage(1);
  //   setAttendanceData([]);
  //   setTableLoading(true);
  //   fetchAttendanceData(1, false, { year: selectedYear, month: selectedMonth, name: selectedName });
  // }, [selectedYear, selectedMonth, selectedName]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !isLoadingMore) {
      console.log('Loading next page:', page + 1);
      fetchAttendanceData(page + 1, true, { year: selectedYear, month: selectedMonth, name: selectedName }); // year add kiya
    }
  };


  // Filter data based on search term, month & name
  const filteredData = attendanceData.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.empIdCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.year.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.monthName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.day.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYear = selectedYear ? item.year.toString() === selectedYear : true;
    const matchesMonth = selectedMonth ? item.monthName === selectedMonth : true;
    const matchesName = selectedName ? item.name === selectedName : true;

    return matchesSearch && matchesYear && matchesMonth && matchesName;
  });



  // Download CSV function
  const downloadCSV = () => {
    if (filteredData.length === 0) return;

    // Define CSV headers
    const headers = [
      'Year', 'Month Name', 'Date', 'Day', 'Company Name', 'Emp ID Code',
      'Name', 'Designation', 'Holiday (Yes/No)', 'Working Day (Yes/No)',
      'N-Holiday (Holiday Name)', 'Status', 'In Time', 'Out Time',
      'Working Hours', 'Late Minutes', 'Early Out', 'Overtime Hours',
      'Punch Miss', 'Remarks'
    ];

    // Convert data to CSV format
    const csvData = filteredData.map(item => [
      item.year, item.monthName, item.date, item.day, item.companyName,
      item.empIdCode, item.name, item.designation, item.holiday, item.workingDay,
      item.nHoliday, item.status, item.inTime, item.outTime, item.workingHours,
      item.lateMinutes, item.earlyOut, item.overtimeHours, item.punchMiss, item.remarks
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_data_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 ml-50 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance Records Daily</h1>
      </div>

      {/* Filters Section */}
      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row gap-4 items-end"> {/* items-end add kiya */}

          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          {/* Year Dropdown */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All</option>
              {uniqueYears.map((year, idx) => (
                <option key={idx} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700">Month:</label>
            <select
              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All</option>
              {uniqueMonths.map((month, idx) => (
                <option key={idx} value={month}>{month}</option>
              ))}
            </select>
          </div>

          {/* Name Dropdown */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium text-gray-700">Name:</label>
            <input
              type="text"
              placeholder="Search name..."
              className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              list="namesList"
            />
            <datalist id="namesList">
              {uniqueNames.map((name, idx) => (
                <option key={idx} value={name} />
              ))}
            </datalist>
          </div>

          {/* OK Button - conditional disable */}
          <button
            onClick={() => {
              setPage(1);
              setAttendanceData([]);
              fetchAttendanceData(1, false, { year: selectedYear, month: selectedMonth, name: selectedName });
            }}
            disabled={!selectedYear && !selectedMonth && !selectedName}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${!selectedYear && !selectedMonth && !selectedName
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
          >
            OK
          </button>

          {/* Download Button */}
          <button
            onClick={downloadCSV}
            disabled={filteredData.length === 0}
            className={`flex items-center px-4 py-2 rounded-lg whitespace-nowrap ${filteredData.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
          >
            <Download size={18} className="mr-2" />
            Download
          </button>

        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div
            className="overflow-x-auto"
            style={{ maxHeight: '70vh', overflowY: 'auto' }}
            onScroll={handleScroll}
          >
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Out Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                </tr>
              </thead>



              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading attendance data...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <p className="text-red-500">Error: {error}</p>
                      <button
                        onClick={fetchAttendanceData}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{item.year}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.monthName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.empIdCode}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.inTime}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.outTime}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.day}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No attendance records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>


            </table>
            {isLoadingMore && (
              <div className="text-center py-4">
                <div className="inline-block w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600 text-sm">Loading more...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendancedaily;