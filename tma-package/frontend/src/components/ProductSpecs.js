import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ProductSpecs = ({ specifications = {} }) => {
  const [expandedGroups, setExpandedGroups] = useState({});

  const defaultSpecs = {
    'Загальні характеристики': {
      'Бренд': 'Generic',
      'Модель': 'Model X',
      'Країна виробник': 'Україна',
      'Гарантія': '12 місяців',
    },
    'Технічні характеристики': {
      'Потужність': '1000 Вт',
      'Напруга': '220 В',
      'Розміри': '30x20x15 см',
      'Вага': '2.5 кг',
    },
  };

  const specs = Object.keys(specifications).length > 0 ? specifications : defaultSpecs;

  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <div className="space-y-4">
      {Object.entries(specs).map(([groupName, groupSpecs]) => (
        <div key={groupName} className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Group Header */}
          <button
            onClick={() => toggleGroup(groupName)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <h3 className="text-lg font-bold text-gray-900">{groupName}</h3>
            {expandedGroups[groupName] ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* Specs Table */}
          {expandedGroups[groupName] && (
            <div className="divide-y divide-gray-200">
              {Object.entries(groupSpecs).map(([key, value], index) => (
                <div
                  key={index}
                  className="grid grid-cols-2 gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-gray-600 font-medium">{key}</div>
                  <div className="text-gray-900">{value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductSpecs;
