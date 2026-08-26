WITH source("sl", "title", "author", "quantity") AS (VALUES
  (1, 'Surveying & Levelling', 'N N Basak', 25),
  (2, 'Concrete Technology (Theory & Practices)', 'M.S. Shetty', 19),
  (3, 'A Text Book of Engineering Materials', 'Dr. M. A. Aziz', 19),
  (4, 'Water Supply and Sanitation', 'M. Feroze Ahmed', 19),
  (5, 'Water Supply And Sanitary Engineering', 'S. C. Rangwala', 10),
  (6, 'Water Supply Engineering', 'Dr. M. A. Aziz', 10),
  (7, 'Strength of Materials', 'F. L. Singer and A. Pytel', 50),
  (8, 'Building Construction', 'Sushil Kumar', 10),
  (9, 'Introductory Methods of Numerical Analysis', 'S. S. Sastry', 25),
  (10, 'Project Planning and Control with PERT and CPM', 'Dr. B. C. Punmia & K. K. Khandelwal', 20),
  (11, 'Design of Concrete Structures', 'Arthur Nilson, David Darwin', 10),
  (12, 'Design of Concrete Structures', 'Arthur Nilson, David Darwin', 16),
  (13, 'Quality Management in Construction Projects', 'Abdul Razzak Rumane', 15),
  (14, 'The Management of Quality in Construction', 'J. L. Ashford', 17),
  (15, 'Principles of Geotechnical Engineering', 'Braja M. Das', 16),
  (16, 'Principles of Foundation Engineering', 'Braja M. Das', 15),
  (17, 'Soil Mechanics and Foundations', 'B. C. Punmia', 16),
  (18, 'Indeterminate Structural Analysis', 'J. S. Kinney', 13),
  (19, 'Statically Indeterminate Structures', 'Chu-Kia Wang', 11),
  (20, 'Prestressed Concrete', 'N. Krishna Raju', 17),
  (21, 'Design of Prestressed Concrete Structures', 'T. Y. Lin, Ned H. Burns', 11),
  (22, 'Design of Steel Structures', 'E. H. Gaylord, Jr., and C. N. Gaylord', 10),
  (23, 'Steel Structures: Design and Behavior', 'Charles Salmon', 15),
  (24, 'Analysis and Design of Steel and Composite Structures', 'Liang, Qing Quan', 10),
  (25, 'Elementary Behaviour of Composite Steel and Concrete Structural Members', 'Deric J. Oehlers', 10),
  (26, 'Matrix Structural Analysis', 'William McGuire, Richard H. Gallager, Ronald D. Zeimian', 10),
  (27, 'Green Home Building: Money-Saving Strategies for an Affordable, Healthy, High-Performance Home', 'Doug Garrett and Miki Cook', 15),
  (28, 'Making Better Buildings: A Comparative Guide to Sustainable Construction for Homeowners and Contractors', 'Chris Magwood', 15),
  (29, 'Housing Reclaimed: Sustainable Homes for Next to Nothing', 'Jessica Kellner', 15),
  (30, 'BIM and Construction Management: Proven Tools, Methods, and Workflows – Second Edition', 'Brad Hardin, Dave McCool', 15),
  (31, 'The Impact of Building Information Modelling', 'Ray Crotty', 20),
  (32, 'Numerical Methods: Design, Analysis, and Computer Implementation of Algorithms', 'Anne Greenbaum', 10),
  (33, 'Numerical Methods for Engineers', 'Steven C. Chapra, Raymond P. Canale', 7),
  (34, 'Applied Numerical Methods with MATLAB® for Engineers and Scientists', 'Steven C. Chapra', 10),
  (35, 'An Introduction to Numerical Methods and Analysis', 'James F. Epperson', 10),
  (36, 'Numerical Methods for Engineers and Scientists Using MATLAB', 'Ramin S. Esfandiari', 7),
  (37, 'Dynamics of Structures', 'Anil K. Chopra', 10),
  (38, 'Dynamics of Structures with MATLAB® Applications', 'Ashok K. Jain', 10),
  (39, 'Matrix Analysis of Structural Dynamics: Applications and Earthquake Engineering', 'Franklin Y. Cheng', 7),
  (40, 'Seismic Design of Building Structures', 'Michael R. Lindeburg PE, Kurt M. McMullin PE', 10),
  (41, 'Structural Dynamics Concepts and Applications', 'Henry R. Busby', 10),
  (42, 'Building Code for Structural Concrete – Code Requirements and Commentary', 'ACI Code-318-25', 5),
  (43, 'Advanced Engineering Mathematics', 'H. K. Dass', 10),
  (44, 'Integral Calculus', 'B. C. Das & B. N. Mukherjee', 10),
  (45, 'Differential Calculus', 'B. C. Das & B. N. Mukherjee', 10),
  (46, 'Fundamentals of Electric Circuits', 'Matthew N. O. Sadiku, Charles K. Alexander', 10),
  (47, 'Analytic Mechanics', 'Rirgil Moring Faires', 5),
  (48, 'Engineering Mechanics: Statics', 'R. C. Hibbeler', 4),
  (49, 'Engineering Mechanics: Dynamics', 'R. C. Hibbeler', 2),
  (50, 'Vector Mechanics for Engineers (Statics & Dynamics)', 'Beer, Johnston, Mazurek', 3),
  (51, 'Vector Mechanics for Engineers', 'Beer, Johnston, Mazurek', 1),
  (52, 'Operations Research Problems & Solutions', 'V. K. Kapoor', 2),
  (53, 'Problems in Operations Research: Principles & Solutions', 'P. K. Gupta, D. S. Hira', 1),
  (54, 'Theory of Simple Structures', 'T. C. Shedd & J. Vawter', 2),
  (55, 'Design of Concrete Structures', 'Arthur H. Nilson, David Darwin, Charles W. Dolan', 5),
  (56, 'Principles of Refrigeration', 'Roy J. Dossat', 2),
  (57, 'Surveying (Volume I)', 'Dr. B. C. Punmia', 7),
  (58, 'A Text Book of Surveying', 'M. A. Aziz & M. Shajahan', 7),
  (59, 'Surveying (Volume II)', 'Dr. B. C. Punmia', 7),
  (60, 'Surveying (Volume III)', 'Dr. B. C. Punmia', 7),
  (61, 'Engineering Materials', 'S. C. Rangwala', 5),
  (62, 'Contract Law', 'Quinn & Elliott', 5),
  (63, 'Construction Contracts: Law and Management', 'John Murdoch and Will Hughes', 4),
  (64, 'Construction Quality Management Principles and Practice', 'Tim Howarth and David Greenwood', 2),
  (65, 'Roads, Railways, Bridges, Tunnels and Harbour-Dock Engineering', 'B. L. Gupta', 5),
  (66, 'Highway Engineering', 'S. K. Khanna and C. E. G. Justo', 5),
  (67, 'Traffic and Highway Engineering', 'Nicholas J. Garber, Lester A. Hoel', 5),
  (68, 'Engineering Mechanics of Solids', 'Popov', 4),
  (69, 'Foundation Analysis and Design', 'Bowles', 5),
  (70, 'Plumbing Principles and Practices', 'Syed Azisul Haq', 15)
), normalized AS (
  SELECT *, REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '', 'g') AS "normalizedTitle"
  FROM source
), deduplicated AS (
  SELECT DISTINCT ON ("normalizedTitle") *
  FROM normalized
  ORDER BY "normalizedTitle", "sl"
)
INSERT INTO "RentalBook" ("id", "title", "author", "imageUrl", "quantity", "price", "active", "createdAt", "updatedAt")
SELECT
  'catalog-' || MD5("title" || ':' || "author"),
  "title", "author", '/Image/home.png', "quantity", 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM deduplicated incoming
WHERE NOT EXISTS (
  SELECT 1 FROM "RentalBook" existing
  WHERE REGEXP_REPLACE(LOWER(existing."title"), '[^a-z0-9]+', '', 'g') = incoming."normalizedTitle"
);
