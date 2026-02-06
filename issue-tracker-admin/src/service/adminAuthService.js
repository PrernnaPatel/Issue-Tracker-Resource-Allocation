const API_URL = "http://localhost:5000/api/admin";

const ALL_STATUSES = ['pending', 'in_progress', 'resolved', 'revoked'];

export const adminLogin = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store token and admin info
    localStorage.setItem('adminToken', data.token);
    localStorage.setItem('adminInfo', JSON.stringify(data.admin));

    return data;
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
};

export const adminLogout = () => {
  try {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

export const getAdminToken = () => {
  return localStorage.getItem('adminToken');
};

export const getAdminInfo = () => {
  const adminInfo = localStorage.getItem('adminInfo');
  return adminInfo ? JSON.parse(adminInfo) : null;
};

// Protected API calls using admin token
export const makeAuthorizedRequest = async (endpoint, options = {}) => {
  const token = getAdminToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

// Fetch all tickets
export const getAllTickets = async () => {
  try {
    const response = await makeAuthorizedRequest('/get-all-tickets');
    console.log('All tickets:', response);
    return response.tickets; // Assuming the backend returns { tickets: [...] }
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    throw error;
  }
};

// Fetch all employees
export const getAllEmployees = async () => {
  try {
    const response = await makeAuthorizedRequest('/get-all-employees');
    console.log('All employees:', response);
    return response.employees; // Backend returns { employees: [...] }
  } catch (error) {
    console.error('Error fetching all employees:', error);
    throw error;
  }
};

export const getEmployeeDetails = async (employeeId) => {
  try {
    const response = await makeAuthorizedRequest(`/get-employee-details/${employeeId}`);
    console.log('Employee details:', response);
    
    // Assuming backend returns { employee: {...}, tickets: [...] }
    if (!response.employee) {
      throw new Error('Employee details not found');
    }

    // Combine employee data with tickets for easier access
    return {
      ...response.employee,
      tickets: response.tickets || []
    };
  } catch (error) {
    console.error('Error fetching employee details:', error);
    throw error;
  }
};

export const getAllDepartments = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/get-departments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch departments');
    }
    return data;
  } catch (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }
};

export const addDepartment = async (departmentData) => {
  try {
    const response = await makeAuthorizedRequest('/add-department', {
      method: 'POST',
      body: JSON.stringify(departmentData)
    });
    return response;
  } catch (error) {
    console.error('Error adding department:', error);
    throw error;
  }
};


export const updateDepartment = async (deptId, departmentData) => {
  try {
    const response = await makeAuthorizedRequest(`/update-department/${deptId}`, {
      method: 'PUT',
      body: JSON.stringify(departmentData)
    });
    return response;
  } catch (error) {
    console.error('Error updating department:', error);
    throw error;
  }
};


export const deleteDepartment = async (deptId) => {
  try {
    const response = await makeAuthorizedRequest(`/delete-department/${deptId}`, {
      method: 'PUT'
    });
    console.log('Department deleted successfully:', response);
    return response;
  } catch (error) {
    console.error('Error deleting department:', error);
    throw error;
  }
};



export const generateTicketReport = async ({
  startDate,
  endDate,
  status = ["all"],
  departments = [],
  includeComments = false
} = {}) => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    // Build query string
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    let statusToSend = status;
    if (Array.isArray(status) && status.length === 1 && status[0] === 'all') {
      statusToSend = ALL_STATUSES;
    }
    if (statusToSend && Array.isArray(statusToSend)) {
      params.append('status', statusToSend.join(','));
    } else if (statusToSend) {
      params.append('status', statusToSend);
    }
    if (departments && Array.isArray(departments)) {
      params.append('departments', departments.join(','));
    } else if (departments) {
      params.append('departments', departments);
    }
    params.append('includeComments', includeComments ? 'true' : 'false');
    const response = await fetch(`${API_URL}/export-report-pdf?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      throw new Error('Failed to generate PDF report');
    }
    // Return the blob for PDF download
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
};

export const getAllBuildings = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');
    
    const response = await fetch(`${API_URL}/all-buildings`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch buildings');
    return data.buildings || []; // Return the buildings array directly
  } catch (error) {
    console.error('Error fetching buildings:', error);
    throw error;
  }
};

export const addBuilding = async (buildingData) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');

    console.log('Building data:', buildingData);

    // Format the data to match backend expectations
    const formattedData = {
      name: buildingData.name,
      floors: buildingData.floors.map((floor) => ({
        floor: floor.floor,
        labs: Array.isArray(floor.labs) ? floor.labs : floor.labs.split(',').map(lab => lab.trim()).filter(Boolean)
      }))
    };

    const response = await fetch(`${API_URL}/add-building`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add building');
    }

    return data;
  } catch (error) {
    console.error('Error adding building:', error);
    throw error;
  }
};

// Departmental Admin Functions
export const getAllDepartmentalAdmins = async () => {
  try {
    const response = await makeAuthorizedRequest('/get-departmental-admins');
    console.log('Departmental admins:', response);

    // Check if response.admin exists and is an array
    if (!response.admin || !Array.isArray(response.admin)) {
      throw new Error('Invalid admin data received');
    }

    // Map the response to match the expected structure
    const formattedAdmins = response.admin.map(admin => ({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      department: {
        _id: admin.department._id,
        name: admin.department.name,
        description: admin.department.description
      },
      isFirstLogin: admin.isFirstLogin,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      // Include locations for network engineers
      ...(admin.locations && { locations: admin.locations })
    }));

    return formattedAdmins;
  } catch (error) {
    console.error('Error fetching departmental admins:', error);
    throw error;
  }
};

export const createDepartmentalAdmin = async (adminData) => {
  try {
    // Format the data to match backend expectations
    const formattedData = {
      name: adminData.name,
      email: adminData.email,
      department: adminData.department
    };

    // If it's a network engineer, format the building assignments
    if (adminData.department.toLowerCase().includes('network engineer') && adminData.buildingAssignments) {
      formattedData.locations = adminData.buildingAssignments.map(assignment => ({
        building: assignment.buildingName, // Backend expects building name, not ID
        floor: assignment.floor,
        labs: assignment.labs || [] // Add labs array - will need to be populated from frontend
      }));
    }

    const response = await makeAuthorizedRequest('/create-departmental-admin', {
      method: 'POST',
      body: JSON.stringify(formattedData)
    });
    return response;
  } catch (error) {
    console.error('Error creating departmental admin:', error);
    throw error;
  }
};

// export const deleteDepartmentalAdmin = async (adminId) => {
//   try {
//     const response = await makeAuthorizedRequest(`/delete-departmental-admin/${adminId}`, {
//       method: 'DELETE'
//     });
//     return response;
//   } catch (error) {
//     console.error('Error deleting departmental admin:', error);
//     throw error;
//   }
// };


export const getAttachment = async (filename) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');
    console.log('Fetching attachment for filename:', filename);

    const response = await fetch(`${API_URL}/get-attachment/${filename}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Attachment response:', response);

    if (!response.ok) {
      throw new Error('Failed to fetch attachment');
    }

    return response;
  } catch (error) {
    console.error('Error fetching attachment:', error);
    throw error;
  }
};

export const exportTicketReportExcel = async ({
  startDate,
  endDate,
  status = ["all"],
  departments = [],
  includeComments = false
} = {}) => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    // Build query string
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    let statusToSend = status;
    if (Array.isArray(status) && status.length === 1 && status[0] === 'all') {
      statusToSend = ALL_STATUSES;
    }
    if (statusToSend && Array.isArray(statusToSend)) {
      params.append('status', statusToSend.join(','));
    } else if (statusToSend) {
      params.append('status', statusToSend);
    }
    if (departments && Array.isArray(departments)) {
      params.append('departments', departments.join(','));
    } else if (departments) {
      params.append('departments', departments);
    }
    params.append('includeComments', includeComments ? 'true' : 'false');
    const response = await fetch(`${API_URL}/export-report-excel?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    if (!response.ok) {
      throw new Error('Failed to generate Excel report');
    }
    // Return the blob for Excel download
    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
};

export const updateBuilding = async (id, buildingData) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');

    // Format the data to match backend expectations (optional, but keeps it consistent)
    const formattedData = {
      name: buildingData.name,
      floors: buildingData.floors.map((floor) => ({
        floor: floor.floor,
        labs: Array.isArray(floor.labs) ? floor.labs : floor.labs.split(',').map(lab => lab.trim()).filter(Boolean)
      }))
    };

    const response = await fetch(`${API_URL}/update-building/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update building');
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating building:", error);
    return {
      success: false,
      message: error.message || "An error occurred.",
    };
  }
};

export const deleteBuilding = async (buildingId) => {
  try {

    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');
    console.log('Deleting building with ID:', buildingId);
    const response = await fetch(`${API_URL}/delete-building/${buildingId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Delete building response:', response);
    const data = await response.json();
    console.log('Delete building data:', data);
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete building');
    }

    return { success: true, message: data.message };
  } catch (error) {
    console.error("Error deleting building:", error);
    return {
      success: false,
      message: error.message || "An error occurred while deleting the building.",
    };
  }
};

export const getAvailableNetworkEngineerFloors = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('No authentication token found');
    const response = await fetch('http://localhost:5000/api/admin/available-network-engineer-floors', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch available floors');
    return data.availableAssignments || [];
  } catch (error) {
    console.error('Error fetching available network engineer floors:', error);
    throw error;
  }
};

export const updateNetworkEngineerLocations = async (adminId, locations) => {
  try {
    const token = getAdminToken();
    if (!token) throw new Error('No authentication token found');
    console.log("locations", locations);
    const response = await fetch(`${API_URL}/update-network-locations/${adminId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locations }),
    });
    const data = await response.json();
    console.log('Update network engineer locations response:', data);
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update locations');
    }
    return data;
  } catch (error) {
    console.error('Error updating network engineer locations:', error);
    throw error;
  }
};

// Component Set Management
export const getComponentSets = async () => {
  try {
    const response = await makeAuthorizedRequest('/get-componentset');
    console.log(response)
    return response.sets;
  } catch (error) {
    console.error('Error fetching component sets:', error);
    throw error;
  }
};

export const addComponentSet = async (setData) => {
  try {
    const response = await makeAuthorizedRequest('/add-componentset', {
      method: 'POST',
      body: JSON.stringify(setData)
    });
    return response;
  } catch (error) {
    console.error('Error adding component set:', error);
    throw error;
  }
};

export const deleteComponentSet = async (setId) => {
  try {
    const response = await makeAuthorizedRequest(`/delete-componentset/${setId}`, {
      method: 'DELETE'
    });
    return response;
  } catch (error) {
    console.error('Error deleting component set:', error);
    throw error;
  }
};

export const editComponentSet = async (setId, setData) => {
  try {
    const response = await makeAuthorizedRequest(`/edit-componentset/${setId}`, {
      method: 'PUT',
      body: JSON.stringify(setData)
    });
    return response;
  } catch (error) {
    console.error('Error editing component set:', error);
    throw error;
  }
};

export const getActionLogs = async (filters = {}) => {
  let url = `${API_URL}/logs`;
  const params = new URLSearchParams();
  if (filters.action) params.append('action', filters.action);
  if (filters.performedBy) params.append('performedBy', filters.performedBy);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if ([...params].length > 0) url += `?${params.toString()}`;
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken && getAdminToken()}`,
    },
  });
  const data = await response.json();
  if (data.success) return data.logs;
  return [];
};