import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, User, Calendar, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllTickets, getAttachment } from '../service/adminAuthService';

const TicketDetail = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachmentUrl, setAttachmentUrl] = useState(null); // State for attachment URL
  const [attachmentType, setAttachmentType] = useState(null); // State for attachment type

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        setLoading(true);
        const tickets = await getAllTickets();
        const foundTicket = Object.values(tickets)
          .flat()
          .find(t => t._id === ticketId);
        
        if (!foundTicket) {
          throw new Error('Ticket not found');
        }
        
        setTicket(foundTicket);
      } catch (error) {
        console.error('Error fetching ticket details:', error);
        toast.error('Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketDetails();
  }, [ticketId]);

  // Clean up attachment URL on unmount or when loading new attachment
  useEffect(() => {
    return () => {
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
      }
    };
  }, [attachmentUrl]);

  // Function to handle attachment display
  const handleAttachmentClick = async (attachmentName) => {
    try {
      // If the same attachment is clicked again, toggle it off
      if (attachmentUrl) {
        window.URL.revokeObjectURL(attachmentUrl);
        setAttachmentUrl(null);
        setAttachmentType(null);
        return;
      }

      const response = await getAttachment(attachmentName);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Determine file type based on extension (can be enhanced with Content-Type)
      const extension = attachmentName.split('.').pop().toLowerCase();
      let type;
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
        type = 'image';
      } else if (extension === 'pdf') {
        type = 'pdf';
      } else {
        type = 'unsupported';
      }

      setAttachmentUrl(url);
      setAttachmentType(type);
    } catch (error) {
      toast.error('Failed to fetch attachment',error);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4B2D87]"></div>
        </div>
    );
  }

  return (
      <div className="p-6">
        <div className="mb-6">
          <Link
            to="/admin/tickets"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Tickets
          </Link>
        </div>

        {ticket && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                ticket.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {ticket.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Priority</p>
                <p className="text-base text-gray-900 capitalize">{ticket.priority}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">From Department</p>
                <p className="text-base text-gray-900">{ticket.from_department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">To Department</p>
                <p className="text-base text-gray-900">{ticket.to_department.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Raised By</p>
                <div className="flex items-center space-x-2">
                  <User size={16} className="text-gray-400" />
                  <p className="text-base text-gray-900">{ticket.raised_by.name}</p>
                </div>
                <p className="text-sm text-gray-500">{ticket.raised_by.email}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
              <p className="text-base text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.attachment && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-500 mb-2">Attachment</p>
                <button
                  onClick={() => handleAttachmentClick(ticket.attachment)}
                  className="inline-flex items-center text-[#4B2D87] hover:underline"
                >
                  <span className="mr-2">
                    {ticket.attachment.split('-').pop()}
                  </span>
                </button>

                {attachmentUrl && (
                  <div className="mt-4">
                    {attachmentType === 'image' && (
                      <img
                        src={attachmentUrl}
                        alt="Attachment"
                        className="max-w-full h-auto rounded-lg border border-gray-200"
                      />
                    )}
                    {attachmentType === 'pdf' && (
                      <iframe
                        src={attachmentUrl}
                        title="Attachment PDF"
                        className="w-full h-[500px] border border-gray-200 rounded-lg"
                      />
                    )}
                    {attachmentType === 'unsupported' && (
                      <p className="text-sm text-red-600">
                        This file type is not supported for preview. Please download to view.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar size={16} className="mr-1" />
                  Created: {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock size={16} className="mr-1" />
                  {new Date(ticket.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default TicketDetail;