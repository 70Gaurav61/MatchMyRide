import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axiosInstance.get('/groups/my-groups');
        setGroups(res.data.groups || []);
      } catch (err) {
        setError('Failed to load groups');
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const handleGroupClick = (groupId) => {
    navigate('/group', { state: { groupId } });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-32">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="text-center text-gray-500">You are not part of any groups.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">My Groups</h2>
      <ul className="space-y-3">
        {groups.map((group) => (
          <li
            key={group._id}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition cursor-pointer"
            onClick={() => handleGroupClick(group._id)}
          >
            {group.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Groups;
