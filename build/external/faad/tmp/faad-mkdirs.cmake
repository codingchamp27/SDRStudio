# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad")
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad")
endif()
file(MAKE_DIRECTORY
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad-build"
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad"
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad/tmp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad-stamp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src"
  "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/faad/src/faad-stamp${cfgdir}") # cfgdir has leading slash
endif()
